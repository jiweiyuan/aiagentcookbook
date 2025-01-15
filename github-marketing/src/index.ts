import dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { Octokit } from '@octokit/core';
import { assert } from 'console';
dotenv.config();

interface GithubRepo {
    owner: string;
    name: string;
}

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const octokit = new Octokit({ auth: GITHUB_TOKEN });
const TARGET_GTITHUB_URL = "https://github.com/disler/always-on-ai-assistant";
// get url from command line argument or use default
const githubUrl = process.argv[2] || TARGET_GTITHUB_URL;

const parseGithubRepo = (url: string): GithubRepo => {
    const cleanUrl = url.trim().replace(/\/+$/, '');
    const urlParts = cleanUrl.split('/').filter(Boolean);
    const owner = urlParts[urlParts.length - 2] as string;
    const name = urlParts[urlParts.length - 1] as string;

    return {owner, name};
};

const saveJSON = async (json: any, filename: string): Promise<void> => {
    try {
        const jsonString = JSON.stringify(json, null, 2);
        const filePath = path.join(__dirname, filename);
        fs.writeFileSync(filePath, jsonString);
    } catch (error) {
        console.error('Error saving CSV file:', error);
        throw error;
    }
};

async function getStargazers(githubRepo: GithubRepo, page: number = 1, perPage: number = 30) {
    console.log(`Getting ${perPage} stargazers for ${githubRepo.owner}/${githubRepo.name} on page ${page} `); 
    const response = await octokit.request('GET /repos/{owner}/{repo}/stargazers', {
        owner: githubRepo.owner,
        repo: githubRepo.name,
        per_page: perPage,
        page,
        headers: {
            'X-GitHub-Api-Version': '2022-11-28'
        }
  })
    return response.data;
}

interface UserInfo {
    login: string;
    url: string;
    url_html: string | null;
    name: string | null;
    email: string | null;
    twitter_username: string | null | undefined;
    company: string | null;
    blog: string | null;
    location: string | null;
    bio: string | null;
}

async function getUserInfo(username: string): Promise<UserInfo> {
    console.log(`Getting info for ${username}`);
    const response = await octokit.request('GET /users/{username}', {
        username,
        headers: {
            'X-GitHub-Api-Version': '2022-11-28'
        }
    });
    const userInfo: UserInfo = {
        login: response.data.login,
        url: response.data.url,
        url_html: response.data.html_url,
        name: response.data.name,
        email: response.data.email,
        twitter_username: response.data.twitter_username,
        company: response.data.company,
        blog: response.data.blog,
        location: response.data.location,
        bio: response.data.bio
    };

    return userInfo;
}

async function saveAllStargazers(githubRepo: GithubRepo) {
    const PER_PAGE = 100;
    let page = 1;
    let allStargazers = [];
    while (true) {
        const stargazers = await getStargazers(githubRepo, page, PER_PAGE);
        allStargazers.push(...stargazers);
        if (stargazers.length < PER_PAGE) {
            break;
        }
        const filteredStargazers = allStargazers.map((stargazer: any) => {
            return {
                login: stargazer.login,
                url: stargazer.url,
                url_html: stargazer.html_url
            }
        });
        await saveJSON(filteredStargazers, 'stargazers.json');

        console.log(`Saving ${allStargazers.length} stargazers to stargazers.json`);
        page++;
    }
    console.log('All stargazers fetched:', allStargazers.length, 'stargazers');
}

async function LoadStargazers() {
    const filePresent = path.join(__dirname, 'stargazers.json');
    const stargazers = fs.readFileSync(filePresent, 'utf8');
    console.log('Loaded stargazers:', stargazers.length, 'stargazers');
    return JSON.parse(stargazers);
}

async function main() {
    // STEP 1: Get all stargazers for a given github repo
    const githubRepo = parseGithubRepo(githubUrl);
    await saveAllStargazers(githubRepo);
    
    // STEP 2: Get info for each stargazer
    const stargazers = await LoadStargazers();
    let userList = [];
    for (const stargazer of stargazers) {
        console.log(`Fetching info for ${stargazer.login}`);
        const userInfo = await getUserInfo(stargazer.login);
        userList.push(userInfo);
        saveJSON(userList, 'stargazers-info.json');
    }

    // STEP 3: Filter users with email and twitter
    let emailUser = userList.filter((user: UserInfo) => user.email);
    let twitterUser = userList.filter((user: UserInfo) => user.twitter_username);
    console.log(`Found ${emailUser.length} users with email`);
    console.log('Found ${twitterUser.length} users with twitter');

    // STEP 4: Use the email and twitter to send a message, boost your business success
    // ...
}

main();