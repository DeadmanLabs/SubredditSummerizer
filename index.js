const axios = require('axios');
const openai = require('openai');

const config = new openai.Configuration({
    apiKey: process.env.OPENAI_API_KEY,
});
const ai = new openai.OpenAIApi(config);

async function scrapeSubreddit(subreddit="wallstreetbets", posts=10) {
    const response = await axios.get(
        `https://www.reddit.com/r/${subreddit}/top.json?limit=${posts}`,
        {
            headers: {
                'User-Agent': 'UltraSummerize/1.0',
            },
        }
    );
    return response.data.data.children.map((post) => post.data);
}

async function scrapeComments(posts) {
    const comments = await Promise.all(
        posts.map(async (post) => {
            const response = await fetch(
                `https://www.reddit.com/r/${post.subreddit}/comments/${post.id}.json`,
                {
                    headers: {
                        'User-Agent': 'UltraSummerize/1.0',
                    },
                }
            );
            const data = await response.json();
            return data[1].data.children.map((comment) => comment.data);
        })
    );
}

async function handleQuery(query, context=undefined)
{
    const completion = await ai.createCompletion({
        model: "text-davinci-003",
        prompt: query,
        n: 1,
        temperature: 0.7,
        max_tokens: 1024,
        context: context
    });
    return completion.data.choices[0].text;
}

async function generateArticle(posts)
{
    const article = handleQuery(
        `
        Write a 3 paragraph article that summerizes the posts on the r/wallstreetbets subreddt and provide analysis on any investments or stock trades mentioned in the posts.
        ${posts.map((post) => `${post.title} - ${post.selftext}\n\n`).join('')}
        `
    );
    return article;
}

async function PostArticle(title, body, image=undefined)
{
    const api = "https://api.medium.com/v1";
    const headers = {
        Authorization: `Bearer ${medium_token}`,
        'Content-Type': 'application/json'
    };
    const data = {
        title,
        contentFormat: 'html',
        content: `<h1>${title}</h1><p>${body}</p>`,
        publishStatus: 'public',
    };
    if (image) {
        data.canonicalUrl = image;
        data.publishStatus = 'draft';
    }
    const response = await fetch(`${api}/users/self/posts`, {
        method: 'POST',
        headers,
        body: JSON.stringify(data),
    });
    const json = await response.json();
    return json;
}

Date.prototype.getWeek = function () {
    var date = new Date(this.getTime());
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() + 3 - ((date.getDay() + 6) % 7));
    var week1 = new Date(date.getFullYear(), 0, 4);
    return (1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7));
}

const monthNames = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
];
const date = new Date();
const week = date.getWeek();

async function main() {
    const posts = await scrapeSubreddit();
    const article = await generateArticle(posts);
    console.log(`Week ${week} ${monthNames[date.getMonth()]} ${date.getFullYear()} - WallStreetBets Overview`);
    console.log(`"${article}"`);
}
main();
