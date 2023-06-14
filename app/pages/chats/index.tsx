import AccountAvatar from "@/components/account/AccountAvatar";
import AccountLink from "@/components/account/AccountLink";
import EntityList from "@/components/entity/EntityList";
import Layout from "@/components/layout";
import {
  CardBox,
  FullWidthSkeleton,
  MediumLoadingButton,
  ThickDivider,
} from "@/components/styled";
import { profileContractAbi } from "@/contracts/abi/profileContract";
import useError from "@/hooks/useError";
import useToasts from "@/hooks/useToast";
import useUriDataLoader from "@/hooks/useUriDataLoader";
import { ProfileUriData } from "@/types";
import { chainToSupportedChainProfileContractAddress } from "@/utils/chains";
import { stringToAddress } from "@/utils/converters";
import { Box, Typography } from "@mui/material";
import * as PushAPI from "@pushprotocol/restapi";
import { ENV } from "@pushprotocol/restapi/src/lib/constants";
import { ethers, providers } from "ethers";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useAccount, useContractRead, useNetwork } from "wagmi";

/**
 * Page with chats.
 */
export default function Chats() {
  const { handleError } = useError();
  const { address } = useAccount();
  const [signer, setSigner] = useState<ethers.Signer | undefined>();
  const [pgpDecryptedPvtKey, setPgpDecryptedPvtKey] = useState<
    string | undefined
  >();
  const [chats, setChats] = useState<PushAPI.IFeeds[] | undefined>();
  const [chatRequests, setChatRequest] = useState<
    PushAPI.IFeeds[] | undefined
  >();

  async function loadSignerAndPgpDecryptedPvtKey() {
    try {
      setChats(undefined);
      setChatRequest(undefined);
      // Check address
      if (!address) {
        return;
      }
      // Define signer
      const provider = new providers.Web3Provider((window as any).ethereum);
      const signer = provider.getSigner();
      // Get existing user
      let user = await PushAPI.user.get({
        account: `eip155:${address}`,
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

  async function loadChatsAndChatRequests() {
    try {
      setChats(undefined);
      setChatRequest(undefined);
      // Check signer and pgpDecryptedPvtKey
      if (!signer || !pgpDecryptedPvtKey) {
        return;
      }
      // Load chats
      const chats = await PushAPI.chat.chats({
        account: `eip155:${address}`,
        toDecrypt: true,
        pgpPrivateKey: pgpDecryptedPvtKey,
        env: ENV.STAGING,
      });
      // Load chat requests
      const chatRequests = await PushAPI.chat.requests({
        account: `eip155:${address}`,
        toDecrypt: true,
        pgpPrivateKey: pgpDecryptedPvtKey,
        env: ENV.STAGING,
      });
      // Update states
      setChats(chats);
      setChatRequest(chatRequests);
    } catch (error: any) {
      handleError(error, true);
    }
  }

  useEffect(() => {
    loadSignerAndPgpDecryptedPvtKey();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address]);

  useEffect(() => {
    loadChatsAndChatRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signer, pgpDecryptedPvtKey]);

  return (
    <Layout maxWidth="md">
      {address && signer && pgpDecryptedPvtKey ? (
        <>
          <Typography variant="h4" fontWeight={700} textAlign="center">
            💬 Chats
          </Typography>
          <EntityList
            entities={chats}
            renderEntityCard={(chat, index) => (
              <ChatCard
                address={address}
                signer={signer}
                pgpDecryptedPvtKey={pgpDecryptedPvtKey}
                chat={chat}
                key={index}
              />
            )}
            noEntitiesText="😐 no chats"
            sx={{ mt: 4 }}
          />
          <ThickDivider sx={{ my: 8 }} />
          <Typography variant="h4" fontWeight={700} textAlign="center">
            👋 Chat requests
          </Typography>
          <EntityList
            entities={chatRequests}
            renderEntityCard={(chatRequest, index) => (
              <ChatCard
                address={address}
                signer={signer}
                pgpDecryptedPvtKey={pgpDecryptedPvtKey}
                chat={chatRequest}
                isRequest={true}
                onRequestAccepted={() => loadChatsAndChatRequests()}
                key={index}
              />
            )}
            noEntitiesText="😐 no chat requests"
            sx={{ mt: 4 }}
          />
        </>
      ) : (
        <FullWidthSkeleton />
      )}
    </Layout>
  );
}

function ChatCard(props: {
  address: string;
  signer: ethers.Signer;
  pgpDecryptedPvtKey: string;
  chat: PushAPI.IFeeds;
  isRequest?: boolean;
  onRequestAccepted?: () => void;
}) {
  const { chain } = useNetwork();
  const { handleError } = useError();
  const { showToastSuccess } = useToasts();
  const interlocutor = props.chat.wallets.split(":")[1];
  const [isRequestAccepting, setIsRequestAccepting] = useState(false);

  /**
   * Define interlocutor profile uri data
   */
  const { data: interlocutorProfileUri } = useContractRead({
    address: chainToSupportedChainProfileContractAddress(chain),
    abi: profileContractAbi,
    functionName: "getURI",
    args: [stringToAddress(interlocutor) || ethers.constants.AddressZero],
  });
  const { data: interlocutorProfileUriData } = useUriDataLoader<ProfileUriData>(
    interlocutorProfileUri
  );

  async function acceptRequest() {
    try {
      setIsRequestAccepting(true);
      await PushAPI.chat.approve({
        status: "Approved",
        account: props.address,
        senderAddress: interlocutor,
        signer: props.signer,
        pgpPrivateKey: props.pgpDecryptedPvtKey,
        env: ENV.STAGING,
      });
      showToastSuccess("Request is accepted");
      props.onRequestAccepted?.();
    } catch (error: any) {
      handleError(error, true);
      setIsRequestAccepting(false);
    }
  }

  return (
    <CardBox sx={{ display: "flex", flexDirection: "row" }}>
      {/* Left part */}
      <Box>
        <AccountAvatar
          account={interlocutor}
          accountProfileUriData={interlocutorProfileUriData}
          size={64}
          emojiSize={28}
        />
      </Box>
      {/* Right part */}
      <Box ml={1.5} display="flex" flexDirection="column">
        <AccountLink
          account={interlocutor}
          accountProfileUriData={interlocutorProfileUriData}
        />
        {props.chat.msg.timestamp && (
          <Typography variant="body2" color="text.secondary">
            {new Date(props.chat.msg.timestamp).toLocaleString()}
          </Typography>
        )}
        <Typography mt={1}>{props.chat.msg.messageContent}</Typography>
        {props.isRequest ? (
          <MediumLoadingButton
            loading={isRequestAccepting}
            disabled={isRequestAccepting}
            variant="outlined"
            onClick={() => acceptRequest()}
            sx={{ mt: 1 }}
          >
            Accept Request
          </MediumLoadingButton>
        ) : (
          <Link href={`/chats/${interlocutor}`}>
            <MediumLoadingButton variant="outlined" sx={{ mt: 1 }}>
              Open Chat
            </MediumLoadingButton>
          </Link>
        )}
      </Box>
    </CardBox>
  );
}
