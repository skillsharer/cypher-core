import { Command } from '../../../terminal/types/commands';
import { twitterGetTweets } from './getTweets';
import { twitterRetweet } from './retweet';
import { twitterSearch } from './search';
import { twitterReply } from './reply';
import { twitterFollow } from './follow';
import { twitterGetMentions } from './getMentions';
import { twitterQuote } from './quote';
import { twitterGetHomepage } from './getHomepage';
import { twitterTweet } from './postTweet';

export const twitterSubCommands: Command[] = [
  twitterGetTweets,
  twitterRetweet,
  twitterSearch,
  twitterReply,
  twitterFollow,
  twitterGetMentions,
  twitterQuote,
  twitterGetHomepage,
  twitterTweet
];