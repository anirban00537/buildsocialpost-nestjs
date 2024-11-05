export interface LinkedInPostResponse {
  postId: string;
  author: string;
  created: number;
}

export interface LinkedInPostError {
  message: string;
  status?: number;
  code?: string;
}

export interface LinkedInPostMedia {
  status: 'READY';
  description: {
    text: string;
  };
  media: string;
  title: {
    text: string;
  };
}

export interface LinkedInPostPayload {
  author: string;
  lifecycleState: 'PUBLISHED';
  specificContent: {
    'com.linkedin.ugc.ShareContent': {
      shareCommentary: {
        text: string;
      };
      shareMediaCategory: 'NONE' | 'IMAGE' | 'VIDEO' | 'ARTICLE';
      media?: LinkedInPostMedia[];
    };
  };
  visibility: {
    'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC';
  };
} 