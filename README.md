# Sunshine Conversations Webhook Server

A Node.js webhook server that integrates with Sunshine Conversations to handle messaging interactions, OpenAI's GPT integration, and Zendesk support features.

## Plugging in your own AI

1. Replace the calling of OpenAI with your own AI model.
2. This is in index.js file at line 55.

## Features

- 🤖 AI-powered responses using OpenAI's GPT-3.5
- 📝 Interactive forms for user information collection
- 👨‍💼 Zendesk agent handoff capability
- 🤔 Zendesk Answer Bot integration
- 🔘 Interactive button menus
- 🔒 Webhook signature verification
- 🏥 Health check endpoint

## Prerequisites

- Node.js (version 18+ recommended for native fetch support)
- Sunshine Conversations account
- OpenAI API access
- Zendesk account (for agent and Answer Bot features)

## Environment Variables

Create a `.env` file with the following variables:

- APP_ID=your_sunshine_app_id
- APP_KEY=your_sunshine_app_key
- APP_SECRET=your_sunshine_app_secret
- WEBHOOK_SECRET=your_webhook_secret
- OPENAI_API_KEY=your_openai_api_key
- PORT=3000 (optional)
- SUNSHINE_CONV_ROOT=https://api.smooch.io (optional)

The server will start on port 3000 by default or the port specified in your environment variables.

## Webhook Endpoints

### POST /webhook

Main webhook endpoint that handles:

- Conversation initialization
- Message processing
- AI responses
- Button interactions
- Form submissions
- Agent handoffs
- Answer Bot integration

### GET /health

Health check endpoint that returns the configuration status of:

- Sunshine Conversations setup
- Zendesk integration

## Message Flow

1. **Conversation Start**

   - Sends welcome message
   - Displays button menu options

2. **User Interactions**

   - Text messages are processed by GPT-3.5
   - Button selections trigger specific actions:
     - Form display
     - Agent handoff
     - Answer Bot connection

3. **Form Submission**
   - Collects user information:
     - Full name
     - Email address
     - Preferred language

## Security

- Webhook signature verification
- Basic authentication for Sunshine API calls
- Error handling for uncaught exceptions
- Rate limiting recommendation for production

## How to Install and Run Locally

1. Clone the repository
2. Install dependencies: `npm install`
3. Create a `.env` file with the required environment variables
4. Start the server: `npm start`

## Calling the Buttons again

1. Type "buttons" in the chat
2. Click the button you want to call again
