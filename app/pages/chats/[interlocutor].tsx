import AccountAvatar from "@/components/account/AccountAvatar";
import AccountLink from "@/components/account/AccountLink";
import EntityList from "@/components/entity/EntityList";
import FormikHelper from "@/components/helper/FormikHelper";
import Layout from "@/components/layout";
import {
  CardBox,
  FullWidthSkeleton,
  LargeLoadingButton,
  WidgetBox,
  WidgetInputTextField,
  WidgetTitle,
} from "@/components/styled";
import { profileContractAbi } from "@/contracts/abi/profileContract";
import useError from "@/hooks/useError";
import useUriDataLoader from "@/hooks/useUriDataLoader";
import { palette } from "@/theme/palette";
import { ProfileUriData } from "@/types";
import { chainToSupportedChainProfileContractAddress } from "@/utils/chains";
import { stringToAddress } from "@/utils/converters";
import { Box, Stack, Typography } from "@mui/material";
import * as PushAPI from "@pushprotocol/restapi";
import { ENV } from "@pushprotocol/restapi/src/lib/constants";
import { ethers, providers } from "ethers";
import { Form, Formik } from "formik";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { useAccount, useContractRead, useNetwork } from "wagmi";
import * as yup from "yup";

/**
 * Page with a chat.
 */
export default function Chat() {
  const router = useRouter();
  const { interlocutor } = router.query;
  const { address } = useAccount();
  const { chain } = useNetwork();

  /**
   * Define connected account profile uri data
   */
  const { data: connectedAccountProfileUri } = useContractRead({
    address: chainToSupportedChainProfileContractAddress(chain),
    abi: profileContractAbi,
    functionName: "getURI",
    args: [
      stringToAddress(address?.toString()) || ethers.constants.AddressZero,
    ],
  });
  const { data: connectedAccountProfileUriData } =
    useUriDataLoader<ProfileUriData>(connectedAccountProfileUri);

  /**
   * Define interlocutor profile uri data
   */
  const { data: interlocutorProfileUri } = useContractRead({
    address: chainToSupportedChainProfileContractAddress(chain),
    abi: profileContractAbi,
    functionName: "getURI",
    args: [
      stringToAddress(interlocutor?.toString()) || ethers.constants.AddressZero,
    ],
  });
  const { data: interlocutorProfileUriData } = useUriDataLoader<ProfileUriData>(
    interlocutorProfileUri
  );

  return (
    <Layout maxWidth="md">
      {address && interlocutor ? (
        <>
          <ChatMessages
            connectedAccount={address}
            connectedAccountProfileUriData={connectedAccountProfileUriData}
            interlocutor={interlocutor.toString()}
            interlocutorProfileUriData={interlocutorProfileUriData}
          />
        </>
      ) : (
        <>
          <FullWidthSkeleton />
        </>
      )}
    </Layout>
  );
}

function ChatMessages(props: {
  connectedAccount: string;
  connectedAccountProfileUriData?: ProfileUriData;
  interlocutor: string;
  interlocutorProfileUriData?: ProfileUriData;
}) {
  const { handleError } = useError();
  const [signer, setSigner] = useState<ethers.Signer | undefined>();
  const [pgpDecryptedPvtKey, setPgpDecryptedPvtKey] = useState<
    string | undefined
  >();
  const [messages, setMessages] = useState<
    PushAPI.IMessageIPFS[] | undefined
  >();

  /**
   * Form states
   */
  const [formValues, setFormValues] = useState({
    message: "",
  });
  const formValidationSchema = yup.object({
    message: yup.string().required(),
  });
  const [isFormSubmitting, setIsFormSubmitting] = useState(false);

  /**
   * Function to load signer and pgp decrypted pvt key
   */
  async function loadSignerAndPgpDecryptedPvtKey() {
    try {
      setSigner(undefined);
      setPgpDecryptedPvtKey(undefined);
      // Define signer
      const provider = new providers.Web3Provider((window as any).ethereum);
      const signer = provider.getSigner();
      // Get existing user
      let user = await PushAPI.user.get({
        account: `eip155:${props.connectedAccount}`,
        env: ENV.STAGING,
      });
      // Create user if not exists
      if (!user) {
        user = await PushAPI.user.create({
          signer: signer,
          env: ENV.STAGING,
        });
      }
      // Define key for decryption
      const pgpDecryptedPvtKey = await PushAPI.chat.decryptPGPKey({
        encryptedPGPPrivateKey: user.encryptedPrivateKey,
        signer: signer,
      });
      // Update states
      setSigner(signer);
      setPgpDecryptedPvtKey(pgpDecryptedPvtKey);
    } catch (error: any) {
      handleError(error, true);
    }
  }

  /**
   * Function to load messages from push protocol
   */
  async function loadMessages() {
    setMessages(undefined);
    // Define messages
    let messages: PushAPI.IMessageIPFS[] = [];
    try {
      // Check signer and pgpDecryptedPvtKey
      if (!signer || !pgpDecryptedPvtKey) {
        return;
      }
      // Define conversation hash
      const conversationHash = await PushAPI.chat.conversationHash({
        account: `eip155:${props.connectedAccount}`,
        conversationId: `eip155:${props.interlocutor}`,
        env: ENV.STAGING,
      });
      // Load chat history
      messages = await PushAPI.chat.history({
        threadhash: conversationHash.threadHash,
        account: `eip155:${props.connectedAccount}`,
        limit: 10,
        toDecrypt: true,
        pgpPrivateKey: pgpDecryptedPvtKey,
        env: ENV.STAGING,
      });
    } catch (error: any) {
      handleError(error, false);
    }
    setMessages(messages);
  }

  /**
   * Function to send message to push protocol
   */
  async function submitForm(values: any, actions: any) {
    try {
      setIsFormSubmitting(true);
      // Send message
      await PushAPI.chat.send({
        messageContent: values.message,
        messageType: "Text",
        receiverAddress: `eip155:${props.interlocutor}`,
        signer: signer,
        pgpPrivateKey: pgpDecryptedPvtKey,
        env: ENV.STAGING,
      });
      // Reload messages
      loadMessages();
      // Reset form
      actions?.resetForm();
    } catch (error: any) {
      handleError(error, true);
    } finally {
      setIsFormSubmitting(false);
    }
  }

  useEffect(() => {
    loadSignerAndPgpDecryptedPvtKey();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.connectedAccount]);

  useEffect(() => {
    loadMessages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.connectedAccount, props.interlocutor, signer, pgpDecryptedPvtKey]);

  return (
    <Box display="flex" flexDirection="column" alignItems="center">
      <Stack
        direction={{ xs: "column", md: "row" }}
        justifyContent="center"
        alignItems="center"
        spacing={2}
      >
        <Typography variant="h4" fontWeight={700}>
          💬 Chat w/
        </Typography>
        <AccountAvatar
          size={42}
          emojiSize={20}
          account={props.interlocutor}
          accountProfileUriData={props.interlocutorProfileUriData}
        />
        <AccountLink
          account={props.interlocutor}
          accountProfileUriData={props.interlocutorProfileUriData}
          variant="h4"
        />
      </Stack>
      <Formik
        initialValues={formValues}
        validationSchema={formValidationSchema}
        onSubmit={submitForm}
      >
        {({ values, errors, touched, handleChange }) => (
          <Form
            style={{
              width: "100%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            <FormikHelper onChange={(values: any) => setFormValues(values)} />
            {/* Message input */}
            <WidgetBox bgcolor={palette.blue} mt={4}>
              <WidgetTitle>Message</WidgetTitle>
              <WidgetInputTextField
                id="message"
                name="message"
                placeholder="Hey!"
                value={values.message}
                onChange={handleChange}
                error={touched.message && Boolean(errors.message)}
                helperText={touched.message && errors.message}
                disabled={isFormSubmitting}
                multiline
                maxRows={4}
                sx={{ width: 1 }}
              />
            </WidgetBox>
            <LargeLoadingButton
              loading={isFormSubmitting}
              variant="contained"
              type="submit"
              disabled={!messages || isFormSubmitting}
              sx={{ mt: 2 }}
            >
              Post message
            </LargeLoadingButton>
          </Form>
        )}
      </Formik>
      <EntityList
        entities={messages}
        renderEntityCard={(message, index) => (
          <ChatMessageCard
            connectedAccount={props.connectedAccount}
            connectedAccountProfileUriData={
              props.connectedAccountProfileUriData
            }
            interlocutor={props.interlocutor}
            interlocutorProfileUriData={props.interlocutorProfileUriData}
            message={message}
            key={index}
          />
        )}
        noEntitiesText="😐 no messages"
        sx={{ mt: 4 }}
      />
    </Box>
  );
}

function ChatMessageCard(props: {
  connectedAccount: string;
  connectedAccountProfileUriData?: ProfileUriData;
  interlocutor: string;
  interlocutorProfileUriData?: ProfileUriData;
  message: PushAPI.IMessageIPFS;
}) {
  const account = props.message.fromDID.split(":")[1];
  const accountProfileUriData =
    account === props.connectedAccount
      ? props.connectedAccountProfileUriData
      : props.interlocutorProfileUriData;

  return (
    <CardBox sx={{ display: "flex", flexDirection: "row" }}>
      {/* Left part */}
      <Box>
        <AccountAvatar
          account={account}
          accountProfileUriData={accountProfileUriData}
          size={64}
          emojiSize={28}
        />
      </Box>
      {/* Right part */}
      <Box width={1} ml={1.5} display="flex" flexDirection="column">
        <AccountLink
          account={account}
          accountProfileUriData={accountProfileUriData}
        />
        {props.message.timestamp && (
          <Typography variant="body2" color="text.secondary">
            {new Date(props.message.timestamp).toLocaleString()}
          </Typography>
        )}
        <Typography mt={1}>{props.message.messageContent}</Typography>
      </Box>
    </CardBox>
  );
}
