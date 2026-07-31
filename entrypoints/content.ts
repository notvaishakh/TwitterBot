import { storage } from "#imports";

const tweetGeter = '[data-testid="tweet"]';
const usernameGeter = '[data-testid="User-Name"]';
const verifiedIcon = '[data-testid="icon-verified"]';
const tweetTextGeter = '[data-testid="tweetText"]';

type FilteredTweet = 
{
  username: string;
  author: string;
  url: string;
  text: string;
};

const filteredTweetsStorage = storage.defineItem<Record<string, FilteredTweet>>("local:filteredTweets", 
{
  fallback: {} 
});

let filteredTweets: Record<string, FilteredTweet> = {};

function checkPost(post:HTMLElement): void
{
  const authorSection = post.querySelector<HTMLElement>(usernameGeter);
  const isVerified = authorSection?.querySelector<SVGElement>(verifiedIcon);
  const tweetWithBorder = post.closest<HTMLElement>('[data-testid="cellInnerDiv"]');

  if(!tweetWithBorder)
  {
    return;
  }
  if (isVerified && authorSection)
  {
    const tweetLink = authorSection.querySelector<HTMLAnchorElement>('a[href*="/status/"]');
    if(tweetLink)
    {
      const tweetUrl = tweetLink.href;
      const isAlreadyStored = filteredTweets[tweetUrl] !== undefined;
      if(!isAlreadyStored)
      {
        const urlParts =new URL(tweetUrl).pathname.split("/").filter(Boolean);
        const username = urlParts[0] ?? "";
        const author = authorSection.innerText.split("\n")[0] ?? username;
        const text = post.querySelector<HTMLElement>(tweetTextGeter)?.innerText ?? "";
        const filteredTweet: FilteredTweet = {
          username: username,
          author,
          url: tweetUrl,
          text: text
        };

        filteredTweets[tweetUrl] = filteredTweet;
        filteredTweetsStorage.setValue(filteredTweets);
        console.log("Saved filtered tweet:", filteredTweet);
      } 
    }
    
    tweetWithBorder.dataset.feedCategory = "filtered";
    tweetWithBorder.style.display = "none";
  }
  else
  {
    tweetWithBorder.dataset.feedCategory = "main";  
    tweetWithBorder.style.display = "";
  }
}

export default defineContentScript({
  matches: ["https://x.com/*", 
    "https://twitter.com/*"
  ],

  async main() {
    console.log("oh, its running");
    filteredTweets = await filteredTweetsStorage.getValue();

    console.log(`Loaded ${Object.keys(filteredTweets).length} filtered tweets`);

    const observer = new MutationObserver(mutations=>{
      mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
          if(!(node instanceof HTMLElement))
          {
            return;
          }

          const containingPost =
          node.closest<HTMLElement>(tweetGeter);

          if (containingPost) 
          {
            checkPost(containingPost);
          }

          const postsInsideNode =
          node.querySelectorAll<HTMLElement>(tweetGeter);

          postsInsideNode.forEach(checkPost);
        })
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    const ogPosts = document.querySelectorAll<HTMLElement>(tweetGeter);
    ogPosts.forEach(checkPost);
  }
});