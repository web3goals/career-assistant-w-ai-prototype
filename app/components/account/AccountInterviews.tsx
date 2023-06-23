import { INTERVIEW_TOPICS } from "@/constants/interviewTopics";
import { interviewContractAbi } from "@/contracts/abi/interviewContract";
import useToasts from "@/hooks/useToast";
import { theme } from "@/theme";
import { palette } from "@/theme/palette";
import { InterviewTopic } from "@/types";
import { isAddressesEqual } from "@/utils/addresses";
import {
  chainToSupportedChainId,
  chainToSupportedChainInterviewContractAddress,
} from "@/utils/chains";
import { stringToAddress } from "@/utils/converters";
import { Avatar, Box, Stack, SxProps, Typography } from "@mui/material";
import { ethers } from "ethers";
import Link from "next/link";
import { useEffect } from "react";
import {
  useAccount,
  useContractRead,
  useContractWrite,
  useNetwork,
  usePrepareContractWrite,
  useWaitForTransaction,
} from "wagmi";
import { CardBox, FullWidthSkeleton, LargeLoadingButton } from "../styled";

/**
 * A component with account interviews.
 */
export default function AccountInterviews(props: {
  address: string;
  sx?: SxProps;
}) {
  return (
    <Stack width={1} spacing={3} sx={{ ...props.sx }}>
      <AccountInterview
        address={props.address}
        topic={INTERVIEW_TOPICS[0]}
        backgroundColor={palette.yellow}
      />
      <AccountInterview
        address={props.address}
        topic={INTERVIEW_TOPICS[1]}
        backgroundColor={palette.purpleLight}
        textColor={theme.palette.primary.contrastText}
      />
      <AccountSoonInterviews />
    </Stack>
  );
}

function AccountInterview(props: {
  address: string;
  topic: InterviewTopic;
  backgroundColor?: string;
  textColor?: string;
}) {
  const { chain } = useNetwork();
  const { address } = useAccount();

  const { data: id } = useContractRead({
    address: chainToSupportedChainInterviewContractAddress(chain),
    abi: interviewContractAbi,
    functionName: "find",
    args: [
      stringToAddress(props.address) || ethers.constants.AddressZero,
      props.topic.id,
    ],
  });

  const { data: params } = useContractRead({
    address: chainToSupportedChainInterviewContractAddress(chain),
    abi: interviewContractAbi,
    functionName: "getParams",
    args: [BigInt(id?.toString() || 0)],
    enabled: id !== undefined,
  });

  if (id === undefined || params === undefined) {
    return <FullWidthSkeleton />;
  }

  return (
    <CardBox
      sx={{
        display: "flex",
        flexDirection: { xs: "column", md: "row" },
        backgroundColor: props.backgroundColor,
        borderColor: props.backgroundColor,
        borderWidth: 7,
        padding: "24px 32px",
        color: props.textColor,
      }}
    >
      {/* Left part */}
      <Box>
        <Avatar sx={{ width: 128, height: 128 }} src={props.topic.image} />
      </Box>
      {/* Right part */}
      <Box mt={{ xs: 2, md: 0 }} ml={{ md: 4 }}>
        <Typography variant="h4" fontWeight={700}>
          {props.topic.title}
        </Typography>
        <Typography mt={1}>
          Earned <strong>{params.points.toString()} experience points</strong>
        </Typography>
        {/* Open button */}
        {id !== BigInt(0) && (
          <Link href={`/interviews/${id}`}>
            <LargeLoadingButton variant="contained" sx={{ mt: 3 }}>
              Open
            </LargeLoadingButton>
          </Link>
        )}
        {/* Start button */}
        {id === BigInt(0) && isAddressesEqual(address, props.address) && (
          <AccountInterviewStartButton topic={props.topic} sx={{ mt: 3 }} />
        )}
      </Box>
    </CardBox>
  );
}

function AccountInterviewStartButton(props: {
  topic: InterviewTopic;
  sx: SxProps;
}) {
  const { chain } = useNetwork();
  const { showToastSuccess, showToastError } = useToasts();

  const { config: contractPrepareConfig, isError: isContractPrepareError } =
    usePrepareContractWrite({
      address: chainToSupportedChainInterviewContractAddress(chain),
      abi: interviewContractAbi,
      functionName: "start",
      args: [props.topic.id],
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

  useEffect(() => {
    if (isTransactionSuccess) {
      showToastSuccess("Interview is started, refresh the page to open it");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTransactionSuccess]);

  const isLoading = isContractWriteLoading || isTransactionLoading;
  const isDisabled =
    isLoading ||
    isTransactionSuccess ||
    isContractPrepareError ||
    !contractWrite;

  return (
    <LargeLoadingButton
      variant="contained"
      disabled={isDisabled}
      loading={isLoading}
      onClick={() => contractWrite?.()}
      sx={{ ...props.sx }}
    >
      Start
    </LargeLoadingButton>
  );
}

function AccountSoonInterviews() {
  return (
    <CardBox
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        borderWidth: 7,
        padding: "38px 32px",
      }}
    >
      <Typography variant="h4" fontWeight={700}>
        ⌛ New interviews coming soon
      </Typography>
    </CardBox>
  );
}
