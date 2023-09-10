// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { Configuration, OpenAIApi } from "azure-openai";
import { ActivityHandler, MessageFactory, TurnContext } from "botbuilder";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config();

const ENV_FILE = path.join(__dirname, ".env");

const configuration = new Configuration({
  apiKey: process.env.AZURE_OPENAI_API_KEY,
  azure: {
    apiKey: process.env.AZURE_OPENAI_API_KEY,
    endpoint: process.env.AZURE_OPENAI_ENDPOINT,
    deploymentName: process.env.AZURE_OPENAI_DEPLOYMENT_NAME,
  },
});

const modelName =
  process.env.AZURE_OPENAI_MODEL_NAME || "gpt-35-turbo (version 0301)";
const setupMessage = {
  role: "system",
  content: "You are an AI assistant that helps people find information.",
};

const openai = new OpenAIApi(configuration);

class OpenAiBot extends ActivityHandler {
  constructor() {
    super();

    this.onMessage(async (context: TurnContext, next: () => Promise<void>) => {
      let replyText = "";
      try {
        const response = await this.createChatResponseFromOpenAi(
          context.activity.text
        );
        console.log(response.data.choices[0]);
        replyText = `${response.data.choices[0].message.content}`;
        console.log(
          `Prompt Tokens: ${response.data.usage.prompt_tokens} | Completion Tokens: ${response.data.usage.completion_tokens} | Total Tokens: ${response.data.usage.total_tokens}`
        );
        console.log(
          `Create Response Text: ${response.data.choices[0].message.content.replace(
            /(\r\n|\n|\r)/gm,
            ""
          )}`
        );
      } catch (error) {
        if (error.response) {
          console.log(error.response.status);
          console.log(error.response.data);
          replyText = `エラーが発生しました。もう1回試してみてね。詳細：${error.response.data}`;
        } else {
          console.log(error.message);
          replyText = `エラーが発生しました。もう1回試してみてね。詳細：${error.message}`;
        }
      } finally {
        await context.sendActivity(MessageFactory.text(replyText, replyText));
        await next();
      }
    });

    this.onMembersAdded(
      async (context: TurnContext, next: () => Promise<void>) => {
        const membersAdded = context.activity.membersAdded;
        const welcomeText = `こんにちは。my-chat-bot - ${modelName}です。`;

        for (const member of membersAdded) {
          if (member.id !== context.activity.recipient.id) {
            await context.sendActivity(
              MessageFactory.text(welcomeText, welcomeText)
            );
          }
        }

        await next();
      }
    );
  }

  private async createChatResponseFromOpenAi(text: string) {
    const request = {
      model: modelName,
      messages: [{ role: "user", content: text }],
      temperature: 1,
      top_p: 0.9,
      presence_penalty: 0,
      frequency_penalty: 1,
      max_tokens: 512,
    };
    return await openai.createChatCompletion({
      model: modelName,
      messages: [{ role: "user", content: text }],
      temperature: 1,
      top_p: 0.9,
      presence_penalty: 0,
      frequency_penalty: 1,
      max_tokens: 512,
    });
  }
}

export { OpenAiBot };
