import Layout from "@/components/layout";
import { ExtraLargeLoadingButton } from "@/components/styled";
import { Box, Typography } from "@mui/material";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import Image from "next/image";
import Link from "next/link";
import { useAccount } from "wagmi";

/**
 * Landing page.
 */
export default function Landing() {
  const { address } = useAccount();
  const { openConnectModal } = useConnectModal();

  return (
    <Layout maxWidth="lg">
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <Box width={{ xs: "100%", md: "50%" }}>
          <Image
            src="/images/mates.png"
            alt="Mates"
            width="100"
            height="100"
            sizes="100vw"
            style={{
              width: "100%",
              height: "auto",
            }}
          />
        </Box>
        <Typography variant="h1" textAlign="center" mt={2}>
          <strong>AI assistant</strong> for building a{" "}
          <strong>great resume</strong> and getting a <strong>dream job</strong>
        </Typography>
        <Typography textAlign="center" mt={4}>
          🎤 Complete technical interviews
        </Typography>
        <Typography textAlign="center" mt={1}>
          ⭐ Earn experience points
        </Typography>
        <Typography textAlign="center" mt={1}>
          🚀 Get the best job offers
        </Typography>
        {address ? (
          <Link href={`/accounts/${address}`}>
            <ExtraLargeLoadingButton variant="contained" sx={{ mt: 4 }}>
              Let’s go!
            </ExtraLargeLoadingButton>
          </Link>
        ) : (
          <ExtraLargeLoadingButton
            variant="contained"
            sx={{ mt: 4 }}
            onClick={() => openConnectModal?.()}
          >
            Let’s go!
          </ExtraLargeLoadingButton>
        )}
      </Box>
    </Layout>
  );
}
