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
import useInterviewPointsLoader from "@/hooks/useInterviewPointsLoader";
import useToasts from "@/hooks/useToast";
import useUriDataLoader from "@/hooks/useUriDataLoader";
import { palette } from "@/theme/palette";
import { InterviewMessage, InterviewTopic, ProfileUriData } from "@/types";
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
   * Define topic
   */
  const { data: topicId } = useContractRead({
    address: chainToSupportedChainInterviewContractAddress(chain),
    abi: interviewContractAbi,
    functionName: "getTopic",
    args: [BigInt(id?.toString() || 0)],
    enabled: id !== undefined,
  });
  const topic = INTERVIEW_TOPICS.find((element) => element.id === topicId);

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

  return (
    <Layout maxWidth="md">
      {id && owner && topic ? (
        <>
          <InteviewTopic
            id={id.toString()}
            topic={topic}
            owner={owner}
            ownerProfileUriData={ownerProfileUriData}
          />
          <ThickDivider sx={{ mt: 8 }} />
          <InterviewMessages
            id={id.toString()}
            topic={topic}
            owner={owner}
            ownerProfileUriData={ownerProfileUriData}
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
}) {
  const { points } = useInterviewPointsLoader(props.id);

  return (
    <Box display="flex" flexDirection="column" alignItems="center">
      <Avatar sx={{ width: 196, height: 196 }} src={props.topic.imageAlt} />
      <Typography variant="h4" fontWeight={700} textAlign="center" mt={3}>
        {props.topic.title}
      </Typography>
      {points !== undefined && (
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
            earned <strong>{points} XP</strong>
          </Typography>
        </Stack>
      )}
    </Box>
  );
}

function InterviewMessages(props: {
  id: string;
  topic: InterviewTopic;
  owner: string;
  ownerProfileUriData?: ProfileUriData;
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
  async function loadMessages() {
    setMessages(undefined);
    // Define messages
    const messages: InterviewMessage[] = [];
    // Add system messages
    messages.push({
      id: `${props.id}_0`,
      interview: props.id.toString(),
      timestamp: 0,
      role: "system",
      content: props.topic.prompt,
      points: 0,
      isSaved: true,
    });
    // Add messages loaded from tableland
    try {
      const response = await axios.get(
        `https://testnets.tableland.network/api/v1/query?statement=select%20%2A%20from%20${process.env.NEXT_PUBLIC_TABLELAND_TABLE}%20where%20interview%20%3D%20${props.id}`
      );
      for (const message of response.data) {
        messages.push({
          id: message.id,
          interview: String(message.interview),
          timestamp: message.timestamp,
          role: message.role,
          content: atob(message.content),
          points: message.points,
          isSaved: true,
        });
      }
    } catch (error: any) {
      if (error?.response?.data?.message !== "Row not found") {
        handleError(error, true);
      }
    }
    setMessages(messages);
  }

  /**
   * Load messages
   */
  useEffect(() => {
    loadMessages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.id]);

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
                        onSaving={() => setIsFormSubmitting(true)}
                        onSaved={(messages) => {
                          setMessages(messages);
                          setIsFormSubmitting(false);
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
            Bro
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
  onSaving: () => void;
  onSaved: (messages: InterviewMessage[]) => void;
  isClose?: boolean;
  onClose?: Function;
}) {
  const { chain } = useNetwork();
  const { showToastSuccess, showToastError } = useToasts();

  /**
   * Dialog states
   */
  const [isOpen, setIsOpen] = useState(!props.isClose);

  /**
   * Define params of not saved messages
   */
  const notSavedMessages = props.messages.filter((message) => !message.isSaved);
  const notSavedMessageTimestamps = notSavedMessages.map((message) =>
    BigInt(message.timestamp)
  );
  const notSavedMessageRoles = notSavedMessages.map((message) => message.role);
  const notSavedMessageContents = notSavedMessages.map((message) =>
    btoa(message.content)
  );
  const notSavedMessagePoints = notSavedMessages.map((message) =>
    BigInt(message.points)
  );

  /**
   * Contract states
   */
  const { config: contractPrepareConfig, isError: isContractPrepareError } =
    usePrepareContractWrite({
      address: chainToSupportedChainInterviewContractAddress(chain),
      abi: interviewContractAbi,
      functionName: "saveMessages",
      args: [
        BigInt(props.id),
        notSavedMessageTimestamps,
        notSavedMessageRoles,
        notSavedMessageContents,
        notSavedMessagePoints,
      ],
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

  const isLoading = isContractWriteLoading || isTransactionLoading;
  const isDisabled =
    isLoading ||
    isTransactionSuccess ||
    isContractPrepareError ||
    !contractWrite;

  /**
   * Function to close dialog
   */
  async function close() {
    setIsOpen(false);
    props.onClose?.();
  }

  useEffect(() => {
    if (isLoading) {
      props.onSaving();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isTransactionSuccess) {
      showToastSuccess("Messages are saved");
      const messages = props.messages.map((message) =>
        !message.isSaved ? { ...message, isSaved: true } : message
      );
      props.onSaved(messages);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTransactionSuccess]);

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
          onClick={() => contractWrite?.()}
          sx={{ mt: 4 }}
        >
          Submit
        </ExtraLargeLoadingButton>
      </DialogCenterContent>
    </Dialog>
  );
}
