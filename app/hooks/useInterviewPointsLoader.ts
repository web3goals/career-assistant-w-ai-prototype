import axios from "axios";
import { useEffect, useState } from "react";
import useError from "./useError";

/**
 * Load interview points from tableland.
 */
export default function useInterviewPointsLoader(interviewId?: string): {
  points: number | undefined;
} {
  const { handleError } = useError();
  const [points, setPoints] = useState<number | undefined>();

  useEffect(() => {
    axios
      .get(
        `https://testnets.tableland.network/api/v1/query?statement=select%20sum%28points%29%20from%20${process.env.NEXT_PUBLIC_TABLELAND_TABLE}%20where%20interview%20%3D%20${interviewId}`
      )
      .then((response) => {
        setPoints(Number(response.data?.[0]?.["sum(points)"]));
      })
      .catch((error) => {
        handleError(error, true);
      });
    setPoints(42);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interviewId]);

  return { points };
}
