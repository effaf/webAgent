# Web agent for Startups

Paste in the YCombinator URL and enter your skills. The app finds companies aligning your skills.

## Screenshots

### Home Page
![Home Page](/public/user-input.png)

### Results Page
![Results Page](/public/results.png)

## Learnings 
- Implementing server actions in Next.js
- API rate limits
- Scraping using Puppeteer

## Future work
- Fine-tune the model to improve accuracy

## Getting Started

1. First, create a new folder and clone the repository using the following shell command
```
git clone https://github.com/effaf/webAgent .
```
2. Create .env file in the same (root) folder, and set up your environment variables
```
OPENAI_API_KEY=<REPLACE WITH YOUR KEY>
GOOGLE_API_KEY=<REPLACE WITH YOUR KEY>
NODE_ENV="development" | "production"
```
3. Install the dependencies
```
npm install
```

4. Run `npm run dev` to start the development server
```
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Contact
Please reach out to me or open a pull request if you spot an improvement <br/>
Email - shlok.kothari@gmail.com
