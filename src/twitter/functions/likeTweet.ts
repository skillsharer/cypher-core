import { scraper } from '../twitterClient';
import { Logger } from '../../utils/logger';
/**
 * Likes a specific tweet
 * @param tweetId - The ID of the tweet to like
 * @returns Promise<boolean> indicating success or failure
 */
export async function likeTweet(tweetId: string): Promise<boolean> {
  try {
    await scraper.likeTweet(tweetId);
    Logger.info(`Successfully liked tweet ${tweetId}`);
    return true;
  } catch (error) {
    Logger.error('Error liking tweet:', error);
    return false;
  }
} 