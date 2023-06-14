import { ProfileUriData } from "@/types";
import { Avatar, SxProps, Typography } from "@mui/material";
import { ethers } from "ethers";
import { emojiAvatarForAddress } from "utils/avatars";
import { ipfsUriToHttpUri, stringToAddress } from "utils/converters";
import { useEnsName, useEnsAvatar } from "wagmi";

/**
 * Component with account avatar.
 */
export default function AccountAvatar(props: {
  account: string;
  accountProfileUriData?: ProfileUriData;
  size?: number;
  emojiSize?: number;
  sx?: SxProps;
}) {
  /**
   * Load ens data
   */
  const { data: ensName } = useEnsName({
    address: stringToAddress(props.account) || ethers.constants.AddressZero,
    chainId: 1,
  });
  const { data: ensAvatar } = useEnsAvatar({
    name: ensName,
    chainId: 1,
  });

  /**
   * Define avatar
   */
  let avatar = undefined;
  if (props.accountProfileUriData?.image) {
    avatar = ipfsUriToHttpUri(props.accountProfileUriData.image);
  } else if (ensAvatar) {
    avatar = ensAvatar;
  }

  return (
    <Avatar
      sx={{
        width: props.size || 48,
        height: props.size || 48,
        borderRadius: props.size || 48,
        background: emojiAvatarForAddress(props.account).color,
        ...props.sx,
      }}
      src={avatar}
    >
      <Typography fontSize={props.emojiSize || 22}>
        {emojiAvatarForAddress(props.account).emoji}
      </Typography>
    </Avatar>
  );
}
