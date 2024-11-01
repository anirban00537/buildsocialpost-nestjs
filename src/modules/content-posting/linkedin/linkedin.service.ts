import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class LinkedInService {
  private readonly logger = new Logger(LinkedInService.name);
  private readonly baseUrl = 'https://api.linkedin.com/v2';
  private readonly apiVersion = '202404';
  
  constructor(private readonly configService: ConfigService) {}

  // Get LinkedIn OAuth URL for user authorization
  async getAuthorizationUrl(): Promise<string> {
    const clientId = this.configService.get<string>('LINKEDIN_CLIENT_ID');
    const redirectUri = this.configService.get<string>('LINKEDIN_REDIRECT_URI');
    const scope = 'w_member_social r_liteprofile w_organization_social r_organization_social';
    
    return `https://www.linkedin.com/oauth/v2/authorization?` +
      `response_type=code&` +
      `client_id=${clientId}&` +
      `redirect_uri=${redirectUri}&` +
      `scope=${scope}`;
  }

  // Exchange authorization code for access token
  async getAccessToken(authCode: string): Promise<any> {
    try {
      const clientId = this.configService.get<string>('LINKEDIN_CLIENT_ID');
      const clientSecret = this.configService.get<string>('LINKEDIN_CLIENT_SECRET');
      const redirectUri = this.configService.get<string>('LINKEDIN_REDIRECT_URI');

      const response = await axios.post('https://www.linkedin.com/oauth/v2/accessToken', null, {
        params: {
          grant_type: 'authorization_code',
          code: authCode,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
        },
      });

      return response.data;
    } catch (error) {
      this.logger.error('Error getting LinkedIn access token:', error);
      throw error;
    }
  }

  // Create a text post on LinkedIn
  async createTextPost(accessToken: string, text: string, userId?: string): Promise<any> {
    try {
      const author = userId ? `urn:li:organization:${userId}` : 'urn:li:person:{{PROFILE_ID}}';
      
      const payload = {
        author: author,
        lifecycleState: 'PUBLISHED',
        specificContent: {
          'com.linkedin.ugc.ShareContent': {
            shareCommentary: {
              text: text
            },
            shareMediaCategory: 'NONE'
          }
        },
        visibility: {
          'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC'
        }
      };

      const response = await axios.post(
        `${this.baseUrl}/ugcPosts`,
        payload,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'X-Restli-Protocol-Version': '2.0.0',
          }
        }
      );

      return response.data;
    } catch (error) {
      this.logger.error('Error creating LinkedIn post:', error);
      throw error;
    }
  }

  // Create a post with media (image/video)
  async createMediaPost(
    accessToken: string, 
    text: string, 
    mediaUrls: string[], 
    userId?: string
  ): Promise<any> {
    try {
      const author = userId ? `urn:li:organization:${userId}` : 'urn:li:person:{{PROFILE_ID}}';
      
      const mediaArray = mediaUrls.map(url => ({
        status: 'READY',
        description: {
          text: 'Media content'
        },
        media: url,
      }));

      const payload = {
        author: author,
        lifecycleState: 'PUBLISHED',
        specificContent: {
          'com.linkedin.ugc.ShareContent': {
            shareCommentary: {
              text: text
            },
            shareMediaCategory: 'IMAGE',
            media: mediaArray
          }
        },
        visibility: {
          'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC'
        }
      };

      const response = await axios.post(
        `${this.baseUrl}/ugcPosts`,
        payload,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'X-Restli-Protocol-Version': '2.0.0',
          }
        }
      );

      return response.data;
    } catch (error) {
      this.logger.error('Error creating LinkedIn media post:', error);
      throw error;
    }
  }

  // Upload media to LinkedIn
  async uploadMedia(accessToken: string, mediaType: 'image' | 'video', mediaData: Buffer): Promise<string> {
    try {
      // Register upload
      const registerUploadResponse = await axios.post(
        `${this.baseUrl}/assets?action=registerUpload`,
        {
          registerUploadRequest: {
            recipes: ['urn:li:digitalmediaRecipe:feedshare-image'],
            owner: 'urn:li:person:{{PROFILE_ID}}',
            serviceRelationships: [{
              relationshipType: 'OWNER',
              identifier: 'urn:li:userGeneratedContent'
            }]
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          }
        }
      );

      // Use the upload URL from the response to upload the actual media
      const uploadUrl = registerUploadResponse.data.value.uploadMechanism['com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest'].uploadUrl;
      
      await axios.put(uploadUrl, mediaData, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': mediaType === 'image' ? 'image/jpeg' : 'video/mp4',
        }
      });

      return registerUploadResponse.data.value.asset;
    } catch (error) {
      this.logger.error('Error uploading media to LinkedIn:', error);
      throw error;
    }
  }

  // Get user profile information
  async getUserProfile(accessToken: string): Promise<any> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/me`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          }
        }
      );
      return response.data;
    } catch (error) {
      this.logger.error('Error getting user profile:', error);
      throw error;
    }
  }

  // Get company pages (organizations) that user can manage
  async getCompanyPages(accessToken: string): Promise<any> {
    try {
      const listUrl = 'https://api.linkedin.com/rest/organizationAcls?q=roleAssignee';
      const listResponse = await axios.get(listUrl, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'X-Restli-Protocol-Version': '2.0.0',
          'LinkedIn-Version': this.apiVersion
        }
      });

      const businessIds = listResponse.data.elements.map(element => 
        element.organization.replace('urn:li:organization:', '')
      );

      const detailsUrl = `https://api.linkedin.com/rest/organizationsLookup?ids=List(${businessIds.join(',')})`;
      const response = await axios.get(detailsUrl, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'X-Restli-Protocol-Version': '2.0.0',
          'LinkedIn-Version': this.apiVersion
        }
      });

      return response.data.results;
    } catch (error) {
      this.logger.error('Error getting company pages:', error);
      throw error;
    }
  }

  // Get posts for a specific page/profile
  async getPosts(accessToken: string, authorId: string, count: number = 10): Promise<any> {
    try {
      const encodedAuthorId = encodeURIComponent(authorId);
      const url = `${this.baseUrl}/rest/posts?author=${encodedAuthorId}&q=author&count=${count}&sortBy=LAST_MODIFIED`;
      
      const response = await axios.get(url, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'X-Restli-Protocol-Version': '2.0.0',
          'LinkedIn-Version': this.apiVersion
        }
      });

      return response.data;
    } catch (error) {
      this.logger.error('Error getting posts:', error);
      throw error;
    }
  }

  // Get single post details with media
  async getPostDetails(accessToken: string, postId: string): Promise<any> {
    try {
      const encodedPostId = encodeURIComponent(postId);
      const url = `${this.baseUrl}/rest/posts/${encodedPostId}`;
      
      const response = await axios.get(url, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'X-Restli-Protocol-Version': '2.0.0',
          'LinkedIn-Version': this.apiVersion
        }
      });

      // If post has images, fetch their details
      if (response.data.content?.multiImage?.images) {
        const mediaIds = response.data.content.multiImage.images.map(img => 
          encodeURIComponent(img.id)
        );

        const mediaUrl = `${this.baseUrl}/rest/images?ids=List(${mediaIds.join(',')})`;
        const mediaResponse = await axios.get(mediaUrl, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'X-Restli-Protocol-Version': '2.0.0',
            'LinkedIn-Version': this.apiVersion
          }
        });

        return {
          ...response.data,
          mediaUrls: Object.values(mediaResponse.data.results).map((item: any) => item.downloadUrl)
        };
      }

      return response.data;
    } catch (error) {
      this.logger.error('Error getting post details:', error);
      throw error;
    }
  }

  // Register media upload
  private async registerMediaUpload(accessToken: string, ownerId: string): Promise<any> {
    try {
      const url = `${this.baseUrl}/assets?action=registerUpload`;
      const data = {
        registerUploadRequest: {
          recipes: ['urn:li:digitalmediaRecipe:feedshare-image'],
          owner: `urn:li:${ownerId}`,
          serviceRelationships: [{
            relationshipType: 'OWNER',
            identifier: 'urn:li:userGeneratedContent'
          }]
        }
      };

      const response = await axios.post(url, data, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'X-Restli-Protocol-Version': '2.0.0',
          'LinkedIn-Version': this.apiVersion
        }
      });

      return {
        uploadUrl: response.data.value.uploadMechanism['com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest'].uploadUrl,
        asset: response.data.value.asset
      };
    } catch (error) {
      this.logger.error('Error registering media upload:', error);
      throw error;
    }
  }
}
