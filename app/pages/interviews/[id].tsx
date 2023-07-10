import AccountAvatar from "@/components/account/AccountAvatar";
import AccountLink from "@/components/account/AccountLink";
import EntityList from "@/components/entity/EntityList";
import FormikHelper from "@/components/helper/FormikHelper";
import Layout from "@/components/layout";
import {
  CardBox,
  DialogCenterContent,
  ExtraLargeLoadingButton,
  FullWidthSkeleton,
  LargeLoadingButton,
  ThickDivider,
  WidgetBox,
  WidgetInputTextField,
  WidgetTitle,
} from "@/components/styled";
import { INTERVIEW_TOPICS } from "@/constants/interviewTopics";
import { DialogContext } from "@/context/dialog";
import { interviewContractAbi } from "@/contracts/abi/interviewContract";
import { profileContractAbi } from "@/contracts/abi/profileContract";
import useError from "@/hooks/useError";
import useIpfs from "@/hooks/useIpfs";
import useToasts from "@/hooks/useToast";
import useUriDataLoader from "@/hooks/useUriDataLoader";
import { palette } from "@/theme/palette";
import {
  InterviewMessage,
  InterviewMessagesUriData,
  InterviewTopic,
  ProfileUriData,
} from "@/types";
import { isAddressesEqual } from "@/utils/addresses";
import {
  chainToSupportedChainId,
  chainToSupportedChainInterviewContractAddress,
  chainToSupportedChainProfileContractAddress,
} from "@/utils/chains";
import { stringToAddress, timestampToDate } from "@/utils/converters";
import { Avatar, Box, Dialog, Stack, Typography } from "@mui/material";
import axios from "axios";
import { ethers } from "ethers";
import { Form, Formik } from "formik";
import { useRouter } from "next/router";
import { useContext, useEffect, useState } from "react";
import {
  useAccount,
  useContractRead,
  useContractWrite,
  useNetwork,
  usePrepareContractWrite,
  useWaitForTransaction,
} from "wagmi";
import * as yup from "yup";

/**
 * Page with an interview.
 */
export default function Interview() {
  const router = useRouter();
  const { id } = router.query;
  const { chain } = useNetwork();

  /**
   * Define topic and messages
   */
  const { data: params } = useContractRead({
    address: chainToSupportedChainInterviewContractAddress(chain),
    abi: interviewContractAbi,
    functionName: "getParams",
    args: [BigInt(id?.toString() || 0)],
    enabled: id !== undefined,
  });
  const topic = INTERVIEW_TOPICS.find(
    (element) => element.id === params?.topic
  );
  const { data: messages } = useUriDataLoader<InterviewMessagesUriData>(
    params?.messagesURI
  );

  /**
   * Define owner
   */
  const { data: owner } = useContractRead({
    address: chainToSupportedChainInterviewContractAddress(chain),
    abi: interviewContractAbi,
    functionName: "ownerOf",
    args: [BigInt(id?.toString() || 0)],
    enabled: id !== undefined,
  });

  /**
   * Define owner profile uri data
   */
  const { data: ownerProfileUri } = useContractRead({
    address: chainToSupportedChainProfileContractAddress(chain),
    abi: profileContractAbi,
    functionName: "getURI",
    args: [stringToAddress(owner) || ethers.constants.AddressZero],
  });
  const { data: ownerProfileUriData } =
    useUriDataLoader<ProfileUriData>(ownerProfileUri);

  const isDataLoaded =
    id && params && topic && (messages || params?.messagesURI === "") && owner;

  return (
    <Layout maxWidth="md">
      {isDataLoaded ? (
        <>
          <InteviewTopic
            id={id.toString()}
            topic={topic}
            owner={owner}
            ownerProfileUriData={ownerProfileUriData}
            points={params.points.toString()}
          />
          <ThickDivider sx={{ mt: 8 }} />
          <InterviewMessages
            id={id.toString()}
            topic={topic}
            owner={owner}
            ownerProfileUriData={ownerProfileUriData}
            messages={messages}
          />
        </>
      ) : (
        <FullWidthSkeleton />
      )}
    </Layout>
  );
}

function InteviewTopic(props: {
  id: string;
  topic: InterviewTopic;
  owner: string;
  ownerProfileUriData?: ProfileUriData;
  points: string;
}) {
  return (
    <Box display="flex" flexDirection="column" alignItems="center">
      <Avatar sx={{ width: 196, height: 196 }} src={props.topic.imageAlt} />
      <Typography variant="h4" fontWeight={700} textAlign="center" mt={3}>
        {props.topic.title}
      </Typography>
      <Stack
        direction={{ xs: "column", md: "row" }}
        justifyContent="center"
        alignItems="center"
        spacing={1}
        mt={1}
      >
        <Typography>Where</Typography>
        <AccountAvatar
          size={24}
          emojiSize={12}
          account={props.owner}
          accountProfileUriData={props.ownerProfileUriData}
        />
        <AccountLink
          account={props.owner}
          accountProfileUriData={props.ownerProfileUriData}
          variant="body1"
        />
        <Typography>
          earned <strong>{props.points} XP</strong>
        </Typography>
      </Stack>
    </Box>
  );
}

function InterviewMessages(props: {
  id: string;
  topic: InterviewTopic;
  owner: string;
  ownerProfileUriData?: ProfileUriData;
  messages?: InterviewMessage[];
}) {
  const { showDialog, closeDialog } = useContext(DialogContext);
  const { address } = useAccount();
  const { handleError } = useError();
  const [messages, setMessages] = useState<InterviewMessage[] | undefined>();

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
   * Get response from chatgpt
   */
  async function submitForm(values: any, actions: any) {
    try {
      setIsFormSubmitting(true);
      if (!messages) {
        throw new Error("Messages are not defined");
      }
      // Define user message
      const userMessageTimestamp = Math.floor(new Date().getTime() / 1000);
      const userMessage: InterviewMessage = {
        id: `${props.id}_${userMessageTimestamp}`,
        interview: props.id.toString(),
        timestamp: userMessageTimestamp,
        role: "user",
        content: values.message,
        points: 0,
        isSaved: false,
      };
      // Prepare messages for chatgpt
      const chatgptMessages = [...messages, userMessage].map((message) => ({
        role: message.role,
        content: message.content,
      }));
      // Send messages to chatgpt
      const chatgptResponse = await axios.post(
        "https://api.openai.com/v1/chat/completions",
        {
          model: "gpt-3.5-turbo",
          messages: chatgptMessages,
          temperature: 0.7,
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization:
              "Bearer " + process.env.NEXT_PUBLIC_OPEN_AI_API_KEY_SECRET,
          },
        }
      );
      // Define chatgpt message
      const chatgptMessageTimestamp = Math.floor(new Date().getTime() / 1000);
      const chatgptMessageContent: string =
        chatgptResponse.data.choices?.[0]?.message?.content;
      const chatgptMessage: InterviewMessage = {
        id: `${props.id}_${chatgptMessageTimestamp}`,
        interview: props.id.toString(),
        timestamp: chatgptMessageTimestamp,
        role: "assistant",
        content: chatgptMessageContent,
        points: chatgptMessageContent.toLowerCase().includes("plus one point")
          ? 1
          : 0,
        isSaved: false,
      };
      // Update messages
      setMessages([...messages, userMessage, chatgptMessage]);
      // Reset form
      actions?.resetForm();
    } catch (error: any) {
      handleError(error, true);
    } finally {
      setIsFormSubmitting(false);
    }
  }

  /**
   * Load messages
   */
  useEffect(() => {
    setMessages(undefined);
    const systemMessage: InterviewMessage = {
      id: `${props.id}_0`,
      interview: props.id.toString(),
      timestamp: 0,
      role: "system",
      content: props.topic.prompt,
      points: 0,
      isSaved: true,
    };
    setMessages(
      props.messages ? [systemMessage, ...props.messages] : [systemMessage]
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.id, props.messages]);

  return (
    <Box display="flex" flexDirection="column" alignItems="center">
      {messages && isAddressesEqual(address, props.owner) && (
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
              <WidgetBox bgcolor={palette.blue} mt={6}>
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
              <Stack direction={{ xs: "column", md: "row" }} spacing={2} mt={2}>
                {/* Submit button */}
                <LargeLoadingButton
                  loading={isFormSubmitting}
                  variant="contained"
                  type="submit"
                  disabled={isFormSubmitting}
                >
                  Post message
                </LargeLoadingButton>
                {/* Save messages button */}
                <LargeLoadingButton
                  disabled={!messages.find((message) => !message.isSaved)}
                  variant="outlined"
                  onClick={() =>
                    showDialog?.(
                      <InterviewSaveMessagesDialog
                        id={props.id}
                        messages={messages}
                        onSaved={(messages) => {
                          setMessages(messages);
                          closeDialog?.();
                        }}
                        onClose={closeDialog}
                      />
                    )
                  }
                >
                  Save messages
                </LargeLoadingButton>
              </Stack>
            </Form>
          )}
        </Formik>
      )}
      <EntityList
        entities={messages?.slice(0).reverse()}
        renderEntityCard={(message, index) => (
          <InterviewMessageCard
            message={message}
            owner={props.owner}
            ownerProfileUriData={props.ownerProfileUriData}
            key={index}
          />
        )}
        noEntitiesText="😐 no messages"
        sx={{ mt: 6 }}
      />
    </Box>
  );
}

function InterviewMessageCard(props: {
  message: InterviewMessage;
  owner: string;
  ownerProfileUriData?: ProfileUriData;
}) {
  if (props.message.role === "system") {
    return <></>;
  }

  return (
    <CardBox
      sx={{
        display: "flex",
        flexDirection: "row",
        borderColor: props.message.isSaved ? palette.divider : palette.blue,
        mt: 2,
      }}
    >
      {/* Left part */}
      <Box>
        {props.message.role === "assistant" ? (
          <Avatar sx={{ background: palette.divider, width: 64, height: 64 }}>
            <Typography fontSize={28}>💪</Typography>
          </Avatar>
        ) : (
          <AccountAvatar
            account={props.owner}
            accountProfileUriData={props.ownerProfileUriData}
            size={64}
            emojiSize={28}
          />
        )}
      </Box>
      {/* Right part */}
      <Box width={1} ml={1.5} display="flex" flexDirection="column">
        {props.message.role === "assistant" ? (
          <Typography fontWeight={700} variant="body2">
            Career Assistant w/ AI
          </Typography>
        ) : (
          <AccountLink
            account={props.owner}
            accountProfileUriData={props.ownerProfileUriData}
          />
        )}
        <Typography variant="body2" color="text.secondary">
          {timestampToDate(props.message.timestamp)?.toLocaleString()}
        </Typography>
        <Typography mt={1}>{props.message.content}</Typography>
      </Box>
    </CardBox>
  );
}

function InterviewSaveMessagesDialog(props: {
  id: string;
  messages: InterviewMessage[];
  onSaved: (messages: InterviewMessage[]) => void;
  isClose?: boolean;
  onClose?: Function;
}) {
  const { chain } = useNetwork();
  const { handleError } = useError();
  const { showToastSuccess, showToastError } = useToasts();
  const { uploadJsonToIpfs } = useIpfs();

  /**
   * Form states
   */
  const [isFormSubmitting, setIsFormSubmitting] = useState(false);
  const [messages, setMessages] = useState<InterviewMessage[] | undefined>(
    undefined
  );
  const [messagesPoints, setMessagesPoints] = useState(0);
  const [messagesUri, setMessagesUri] = useState("");

  /**
   * Dialog states
   */
  const [isOpen, setIsOpen] = useState(!props.isClose);

  /**
   * Contract states
   */
  const { config: contractPrepareConfig, isError: isContractPrepareError } =
    usePrepareContractWrite({
      address: chainToSupportedChainInterviewContractAddress(chain),
      abi: interviewContractAbi,
      functionName: "saveMessages",
      args: [BigInt(props.id), BigInt(messagesPoints), messagesUri],
      chainId: chainToSupportedChainId(chain),
      onError(error: any) {
        showToastError(error);
      },
    });
  const {
    data: contractWriteData,
    isLoading: isContractWriteLoading,
    write: contractWrite,
  } = useContractWrite(contractPrepareConfig);
  const { isLoading: isTransactionLoading, isSuccess: isTransactionSuccess } =
    useWaitForTransaction({
      hash: contractWriteData?.hash,
    });

  /**
   * Form states
   */
  const isLoading =
    isFormSubmitting || isContractWriteLoading || isTransactionLoading;
  const isDisabled =
    isLoading ||
    isTransactionSuccess ||
    isContractPrepareError ||
    !contractWrite;

  /**
   * Function to close dialog
   */
  async function close() {
    if (!isLoading) {
      setIsOpen(false);
      props.onClose?.();
    }
  }

  /**
   * Upload messages to IPFS and calculate message points
   */
  async function submit() {
    try {
      setIsFormSubmitting(true);
      const messages = props.messages.map((message) =>
        !message.isSaved ? { ...message, isSaved: true } : message
      );
      const messagesPoints = messages.reduce(
        (sum, message) => sum + message.points,
        0
      );
      const { uri: messagesUri } = await uploadJsonToIpfs(messages);
      setMessages(messages);
      setMessagesPoints(messagesPoints);
      setMessagesUri(messagesUri);
    } catch (error: any) {
      handleError(error, true);
    }
  }

  /**
   * Write data to contract if form was submitted
   */
  useEffect(() => {
    if (messagesUri !== "" && contractWrite && !isContractWriteLoading) {
      contractWrite?.();
      setMessagesUri("");
      setIsFormSubmitting(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messagesUri, contractWrite, isContractWriteLoading]);

  /**
   * Display success message if messages are saved
   */
  useEffect(() => {
    if (isTransactionSuccess && messages) {
      showToastSuccess("Messages are saved, result will be updated soon");
      props.onSaved(messages);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTransactionSuccess, messages]);

  return (
    <Dialog open={isOpen} onClose={close} maxWidth="sm" fullWidth>
      <DialogCenterContent>
        <Typography variant="h4" fontWeight={700} textAlign="center">
          🏁 Save messages
        </Typography>
        <Typography textAlign="center" mt={1}>
          and update the number of earned experience points
        </Typography>
        <ExtraLargeLoadingButton
          variant="outlined"
          type="submit"
          disabled={isDisabled}
          loading={isLoading}
          onClick={() => submit()}
          sx={{ mt: 4 }}
        >
          Submit
        </ExtraLargeLoadingButton>
      </DialogCenterContent>
    </Dialog>
  );
}
