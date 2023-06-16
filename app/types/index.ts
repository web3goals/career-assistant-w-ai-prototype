export type InterviewTopic = {
  id: string;
  title: string;
  titleAlt: string;
  image: string;
  imageAlt: string;
  prompt: string;
};

export type InterviewMessage = {
  id: string; // Combination of interview and timestamp
  interview: string;
  timestamp: number;
  role: "system" | "assistant" | "user";
  content: string;
  points: number;
  isSaved: boolean;
};

export type ProfileUriData = {
  name: string;
  image: string;
  attributes: [
    { trait_type: "name"; value: string },
    { trait_type: "about"; value: string },
    { trait_type: "email"; value: string },
    { trait_type: "website"; value: string },
    { trait_type: "twitter"; value: string },
    { trait_type: "telegram"; value: string },
    { trait_type: "instagram"; value: string }
  ];
};
