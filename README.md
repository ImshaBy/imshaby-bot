# Evemovies bot

### BETA version

## Introduction

Hello, let me introduce you Eve - your indispensable helper in a world of movies!

How many times has it happened to you that you wanted to watch a movie once it's available online but in the end you simply forgot about that? I guess quite often! That's why Eve exists! She'll remind you once the movies you're watching for are available and you can watch them!

## How to start

To start using Eve, simply add her in [Telegram](http://t.me/evemovies_bot) and press /start! It's easy, you'll see yourself!

## Materials

[ru] Подробнее познакомиться с процессом разработки Eve можно в статье, опубликованной на [Хабре](https://habr.com/ru/post/443876/)

[en] WIP

## Contribution

Eve is happy to receive any feedback you have! Feel free to create an issue here. Or, if you're a developer, I'd really be happy to get some PRs from you :)

## Frameworks Used
+ [Serverless Framework](https://www.serverless.com/framework/docs/getting-started/)
+ [Telegraf Bot Framework](https://telegraf.js.org/)

## Requirements
+ AWS credentials [configured](https://serverless.com/framework/docs/providers/aws/guide/credentials/).
+ [NodeJS](https://nodejs.org/) 12.x.
+ A [Telegram](https://telegram.org/) account.

## Installation

+ Install the Serverless Framework
```
npm install -g serverless
```

+ Install the required plugins
```
npm install
```

+ Create a [Telegram bot](https://core.telegram.org/bots#3-how-do-i-create-a-bot) using [@BotFather](https://telegram.me/BotFather).

+ Add the token received to `serverless.env.yml` file
```
cat serverless.env.yml

TELEGRAM_TOKEN: <your_token>
```

+ Deploy the application. (QA env example)
```
serverless deploy --aws-profile amplify --stage qa
```

+ Using `setWebhook` URL the configuration, register the webhook on Telegram
```
curl -X POST https://<api_endpoint_url>/prod/setWebhook
```

## Usage
Now you can `/start` a conversation with the bot.

## Removal
+ To delete the project from AWS.
```
serverless remove
```