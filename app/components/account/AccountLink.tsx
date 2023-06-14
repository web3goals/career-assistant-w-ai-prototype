import { ProfileUriData } from "@/types";
import { Link as MuiLink, SxProps, TypographyProps } from "@mui/material";
import { ethers } from "ethers";
import Link from "next/link";
import { theme } from "theme";
import { addressToShortAddress, stringToAddress } from "utils/converters";
import { useEnsName } from "wagmi";

/**
 * Component with account link.
 */
export default function AccountLink(props: {
  account: string;
  accountProfileUriData?: ProfileUriData;
  color?: string;
  variant?: TypographyProps["variant"];
  textAlign?: TypographyProps["textAlign"];
  sx?: SxProps;
}) {
  /**
   * Load ens data
   */
  const { data: ensName } = useEnsName({
    address: stringToAddress(props.account) || ethers.constants.AddressZero,
    chainId: 1,
  });

  /**
   * Define name
   */
  let name = addressToShortAddress(props.account);
  if (props.accountProfileUriData?.attributes[0].value) {
    name = props.accountProfileUriData.attributes[0].value + ` (${name})`;
  } else if (ensName) {
    name = ensName + ` (${name})`;
  }

  return (
    <Link href={`/accounts/${props.account}`} passHref legacyBehavior>
      <MuiLink
        fontWeight={700}
        variant={props.variant || "body2"}
        color={props.color || theme.palette.primary.main}
        textAlign={props.textAlign || "start"}
        sx={{ ...props.sx }}
      >
        {name}
      </MuiLink>
    </Link>
  );
}
