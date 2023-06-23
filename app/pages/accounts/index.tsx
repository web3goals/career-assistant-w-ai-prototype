import AccountAvatar from "@/components/account/AccountAvatar";
import AccountLink from "@/components/account/AccountLink";
import EntityList from "@/components/entity/EntityList";
import Layout from "@/components/layout";
import { CardBox, FullWidthSkeleton } from "@/components/styled";
import { INTERVIEW_TOPICS } from "@/constants/interviewTopics";
import { interviewContractAbi } from "@/contracts/abi/interviewContract";
import { profileContractAbi } from "@/contracts/abi/profileContract";
import useUriDataLoader from "@/hooks/useUriDataLoader";
import { palette } from "@/theme/palette";
import { ProfileUriData } from "@/types";
import {
  chainToSupportedChainInterviewContractAddress,
  chainToSupportedChainProfileContractAddress,
} from "@/utils/chains";
import { stringToAddress } from "@/utils/converters";
import { Box, Stack, SxProps, Typography } from "@mui/material";
import { ethers } from "ethers";
import {
  paginatedIndexesConfig,
  useContractInfiniteReads,
  useContractRead,
  useNetwork,
} from "wagmi";

/**
 * Page with accounts.
 */
export default function Accounts() {
  const { chain } = useNetwork();

  const profileContractConfig = {
    address:
      chainToSupportedChainProfileContractAddress(chain) ||
      ethers.constants.AddressZero,
    abi: profileContractAbi,
  };

  const { data: owners } = useContractInfiniteReads({
    cacheKey: "owners",
    ...paginatedIndexesConfig(
      (index: bigint) => {
        return [
          {
            ...profileContractConfig,
            functionName: "ownerOf",
            args: [index] as const,
          },
        ];
      },
      { start: 1, perPage: 10, direction: "increment" }
    ),
  });

  const addresses: any[] | undefined = owners?.pages?.[0].map(
    (element) => element.result
  );

  return (
    <Layout maxWidth="md">
      <Typography variant="h4" fontWeight={700} textAlign="center">
        ✨ People with great resumes
      </Typography>
      <EntityList
        entities={addresses}
        renderEntityCard={(address, index) => (
          <AccountCard key={index} address={address} />
        )}
        noEntitiesText="😐 no people"
        sx={{ mt: 4 }}
      />
    </Layout>
  );
}

function AccountCard(props: { address?: string; sx?: SxProps }) {
  const { chain } = useNetwork();

  /**
   * Define profile uri data
   */
  const { data: profileUri } = useContractRead({
    address: chainToSupportedChainProfileContractAddress(chain),
    abi: profileContractAbi,
    functionName: "getURI",
    args: [stringToAddress(props.address) || ethers.constants.AddressZero],
  });
  const { data: profileUriData } = useUriDataLoader<ProfileUriData>(profileUri);

  /**
   * Define interview ids
   */
  const { data: interview0id } = useContractRead({
    address: chainToSupportedChainInterviewContractAddress(chain),
    abi: interviewContractAbi,
    functionName: "find",
    args: [
      stringToAddress(props.address) || ethers.constants.AddressZero,
      INTERVIEW_TOPICS[0].id,
    ],
  });
  const { data: interview1id } = useContractRead({
    address: chainToSupportedChainInterviewContractAddress(chain),
    abi: interviewContractAbi,
    functionName: "find",
    args: [
      stringToAddress(props.address) || ethers.constants.AddressZero,
      INTERVIEW_TOPICS[1].id,
    ],
  });

  /**
   * Define interview points
   */
  const { data: interview0Params } = useContractRead({
    address: chainToSupportedChainInterviewContractAddress(chain),
    abi: interviewContractAbi,
    functionName: "getParams",
    args: [BigInt(interview0id?.toString() || 0)],
    enabled: interview0id !== undefined,
  });
  const { data: interview1Params } = useContractRead({
    address: chainToSupportedChainInterviewContractAddress(chain),
    abi: interviewContractAbi,
    functionName: "getParams",
    args: [BigInt(interview1id?.toString() || 0)],
    enabled: interview1id !== undefined,
  });

  if (!props.address) {
    return <></>;
  }

  if (interview0Params === undefined || interview1Params === undefined) {
    return <FullWidthSkeleton />;
  }

  return (
    <CardBox sx={{ display: "flex", flexDirection: "row", ...props.sx }}>
      {/* Left part */}
      <Box>
        <AccountAvatar
          account={props.address}
          accountProfileUriData={profileUriData}
          size={64}
          emojiSize={28}
        />
      </Box>
      {/* Right part */}
      <Box width={1} ml={1.5} display="flex" flexDirection="column">
        <AccountLink
          account={props.address}
          accountProfileUriData={profileUriData}
        />
        {profileUriData?.attributes[1].value && (
          <Typography variant="body2" mt={0.5}>
            {profileUriData?.attributes[1].value}
          </Typography>
        )}
        <Stack direction="row" spacing={2} mt={2}>
          <Typography variant="body2" fontWeight={700} color={palette.yellow}>
            {INTERVIEW_TOPICS[0].titleAlt} {interview0Params.points.toString()}{" "}
            XP
          </Typography>
          <Typography
            variant="body2"
            fontWeight={700}
            color={palette.purpleLight}
          >
            {INTERVIEW_TOPICS[1].titleAlt} {interview1Params.points.toString()}{" "}
            XP
          </Typography>
        </Stack>
      </Box>
    </CardBox>
  );
}
