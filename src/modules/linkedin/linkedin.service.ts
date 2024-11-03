import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import axios from 'axios';
import { successResponse, errorResponse } from 'src/shared/helpers/functions';
import { ResponseModel } from 'src/shared/models/response.model';

@Injectable()
export class LinkedInService {
  private readonly logger = new Logger(LinkedInService.name);
  private readonly baseUrl = 'https://api.linkedin.com/v2';
  private readonly apiVersion = '202404';
  private stateMap = new Map<string, number>();

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async getAuthorizationUrl(userId: number): Promise<ResponseModel> {
    try {
      const clientId = this.configService.get<string>('LINKEDIN_CLIENT_ID');
      const redirectUri = this.configService.get<string>('LINKEDIN_REDIRECT_URI');
      const state = Math.random().toString(36).substring(7);

      // Store state with userId
      this.stateMap.set(state, userId);
      console.log(`Generated state for userId ${userId}:`, state);

      // Using the exact scopes from your OAuth 2.0 settings
      const scope = [
        'openid',           // Use your name and photo
        'profile',          // Use your name and photo
        'w_member_social',  // Create, modify, and delete posts
        'email'            // Use primary email address
      ].join(' ');

      const url =
        `https://www.linkedin.com/oauth/v2/authorization?` +
        `response_type=code&` +
        `client_id=${clientId}&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `state=${state}&` +
        `scope=${encodeURIComponent(scope)}`;

      return successResponse('Authorization URL generated successfully', {
        url,
        state,
      });
    } catch (error) {
      return errorResponse(`Failed to generate authorization URL: ${error.message}`);
    }
  }

  async handleOAuthCallback(code: string, state: string): Promise<ResponseModel> {
    try {
      // Log initial callback data
      console.log('=== OAuth Callback Started ===');
      console.log('State received:', state);
      console.log('Code length:', code.length);

      // Verify state and get userId
      const userId = this.stateMap.get(state);
      console.log('Found userId:', userId);

      if (!userId) {
        console.log('State validation failed - no userId found');
        return errorResponse('Invalid state parameter');
      }

      // Clean up state
      this.stateMap.delete(state);
      console.log('State map cleared');

      // Get access token
      console.log('Requesting access token...');
      const tokenData = await this.getAccessToken(code);
      console.log('Access token received:', {
        token_type: tokenData.token_type,
        expires_in: tokenData.expires_in,
      });

      // Get user profile using OpenID userinfo
      console.log('Getting user profile...');
      const profileData = await this.getUserProfile(tokenData.access_token);
      
      if (!profileData.sub) {
        throw new Error('No profile ID received from LinkedIn');
      }

      const expiresAt = new Date();
      expiresAt.setSeconds(expiresAt.getSeconds() + tokenData.expires_in);

      console.log('Upserting LinkedIn profile...');
      const linkedInProfile = await this.prisma.linkedInProfile.upsert({
        where: {
          profileId: profileData.sub,
        },
        create: {
          user: {
            connect: {
              id: userId
            }
          },
          profileId: profileData.sub,
          accessToken: tokenData.access_token,
          name: profileData.name || 'LinkedIn User',
          email: profileData.email,
          avatarUrl: profileData.picture || null,
          clientId: this.configService.get('LINKEDIN_CLIENT_ID'),
          creatorId: profileData.sub,
          tokenExpiringAt: expiresAt,
          linkedInProfileUrl: null,
        },
        update: {
          accessToken: tokenData.access_token,
          name: profileData.name || 'LinkedIn User',
          email: profileData.email,
          avatarUrl: profileData.picture || null,
          tokenExpiringAt: expiresAt,
        },
      });

      console.log('LinkedIn profile upserted successfully:', {
        profileId: linkedInProfile.profileId,
        name: linkedInProfile.name,
        email: linkedInProfile.email,
      });

      console.log('=== OAuth Callback Completed Successfully ===');

      return successResponse('LinkedIn profile connected successfully', {
        profile: linkedInProfile,
      });
    } catch (error) {
      console.log('=== OAuth Callback Error ===');
      console.log('Error message:', error.message);
      console.log('Error stack:', error.stack);
      console.log('Response data:', error.response?.data);
      console.log('Response status:', error.response?.status);
      console.log('Response headers:', error.response?.headers);
      console.log('=== End Error Log ===');

      return errorResponse(`Failed to handle OAuth callback: ${error.message}`);
    }
  }

  private async getAccessToken(code: string): Promise<any> {
    try {
      const clientId = this.configService.get<string>('LINKEDIN_CLIENT_ID');
      const clientSecret = this.configService.get<string>('LINKEDIN_CLIENT_SECRET');
      const redirectUri = this.configService.get<string>('LINKEDIN_REDIRECT_URI');

      this.logger.debug('Token exchange parameters:', {
        clientId,
        redirectUri,
        codeLength: code.length,
      });

      const formData = new URLSearchParams();
      formData.append('grant_type', 'authorization_code');
      formData.append('code', code.trim()); // Ensure no whitespace
      formData.append('client_id', clientId);
      formData.append('client_secret', clientSecret);
      formData.append('redirect_uri', redirectUri);

      const response = await axios.post(
        'https://www.linkedin.com/oauth/v2/accessToken',
        formData.toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      this.logger.debug('Token exchange successful');
      return response.data;
    } catch (error) {
      this.logger.error('Token exchange error:', {
        error: error.response?.data,
        status: error.response?.status,
        headers: error.response?.headers
      });
      throw new Error(`Token exchange failed: ${error.response?.data?.error_description || error.message}`);
    }
  }

  private async getUserProfile(accessToken: string): Promise<any> {
    try {
      console.log('Getting user profile with token:', accessToken.substring(0, 10) + '...');
      
      // Only use the OpenID userinfo endpoint
      const response = await axios.get(
        'https://api.linkedin.com/v2/userinfo',
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      console.log('User profile data received:', {
        sub: response.data.sub,
        name: response.data.name,
        email: response.data.email,
        picture: response.data.picture,
      });

      return response.data;
    } catch (error) {
      console.log('Error getting user profile:', {
        error: error.response?.data,
        status: error.response?.status,
        headers: error.response?.headers
      });
      throw new Error(`Failed to get user profile: ${error.response?.data?.message || error.message}`);
    }
  }

  async getUserLinkedInProfiles(userId: number): Promise<ResponseModel> {
    try {
      const profiles = await this.prisma.linkedInProfile.findMany({
        where: {
          userId: userId,
        },
        select: {
          id: true,
          profileId: true,
          name: true,
          avatarUrl: true,
          linkedInProfileUrl: true,
          tokenExpiringAt: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (!profiles.length) {
        return successResponse('No LinkedIn profiles found', { profiles: [] });
      }

      // Check for expired tokens
      const now = new Date();
      const activeProfiles = profiles.map(profile => ({
        ...profile,
        isTokenExpired: profile.tokenExpiringAt < now,
      }));

      return successResponse('LinkedIn profiles retrieved successfully', {
        profiles: activeProfiles,
      });
    } catch (error) {
      this.logger.error('Error getting LinkedIn profiles:', error);
      return errorResponse(`Failed to get LinkedIn profiles: ${error.message}`);
    }
  }

  // Optional: Add method to check if a profile's token is expired
  async isTokenExpired(profileId: string): Promise<boolean> {
    try {
      const profile = await this.prisma.linkedInProfile.findUnique({
        where: { profileId },
        select: { tokenExpiringAt: true },
      });

      if (!profile) {
        return true;
      }

      return profile.tokenExpiringAt < new Date();
    } catch (error) {
      this.logger.error('Error checking token expiration:', error);
      return true;
    }
  }

  // Optional: Add method to refresh token if needed
  async refreshToken(profileId: string): Promise<ResponseModel> {
    try {
      const profile = await this.prisma.linkedInProfile.findUnique({
        where: { profileId },
      });

      if (!profile) {
        return errorResponse('Profile not found');
      }

      // LinkedIn doesn't support refresh tokens for basic profile scope
      // For now, we'll just return a message to re-authenticate
      return errorResponse('Token expired. Please reconnect your LinkedIn account');
    } catch (error) {
      this.logger.error('Error refreshing token:', error);
      return errorResponse(`Failed to refresh token: ${error.message}`);
    }
  }
}
