require('dotenv').config();
const express = require('express');
const fetch = require('node-fetch'); // or use native fetch if on Node 18+

// Environment variables
const SUNSHINE_CONV_ROOT = process.env.SUNSHINE_CONV_ROOT || 'https://api.smooch.io';
const appId = process.env.APP_ID;
const appKey = process.env.APP_KEY;
const appSecret = process.env.APP_SECRET;

const app = express();

// Add this before your routes
app.use(express.json());

// Basic security middleware
app.use((req, res, next) => {
  // Verify webhook signature if provided

  const signature = req.headers['x-api-key'];

  if (signature === process.env.WEBHOOK_SECRET) {
    // Implement signature verification
    // https://docs.smooch.io/guide/webhooks/#security-1
    next();
  } else {
    res.status(401).json({ error: 'Unauthorized' });
  }
  // Rate limiting (consider using express-rate-limit in production)
});

app.post('/webhook', express.json(), async (req, res) => {
  // console.log(req.body.events[0].payload);

  try {
    const { payload } = req.body.events[0];
    // Validate incoming webhook
    if (
      !payload.conversation.id ||
      (payload.conversation.id === 'message:appUser' && (!payload.messages || !payload.messages[0]))
    ) {
      return res.status(400).json({ error: 'Invalid webhook payload' });
    }
    if (payload.creationReason === 'startConversation') {
      // start of conversation
      await sendMessage(payload.conversation.id, {
        type: 'text',
        text: `Welcome to the Sunshine Conversational AI! Send me a message and I will reply by generative AI or choose one of the options below.`
      });
      await sendButtons(payload.conversation.id);
    }
    if (payload.message?.author.type === 'user' && payload.message?.content?.type === 'text') {
      // Only process text messages without payloads
      if (!payload.message.content.payload) {
        // Insert your Generative AI Here
        // Get user message
        const userMessage = payload.message.content.text;

        // Call OpenAI API
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
          },
          body: JSON.stringify({
            model: 'gpt-3.5-turbo',
            messages: [
              {
                role: 'user',
                content: userMessage
              }
            ],
            temperature: 0.7,
            max_tokens: 500
          })
        });

        const aiResponse = await response.json();
        console.log('Ai response', aiResponse.choices[0]);
        // Send AI response back to user
        await sendMessage(payload.conversation.id, {
          type: 'text',
          text: aiResponse.choices[0].message.content
        });
        /* await sendMessage(payload.conversation.id, {
          type: 'text',
          text: `Thank you for submitting your message. Your message was ${payload.message.content.text}`
        }); */
      }
    }

    if (payload.message?.content?.text?.includes('buttons')) {
      // Resend Buttons
      await sendButtons(payload.conversation.id);
    }

    if (payload.message?.author?.type === 'user') {
      const buttonPayload = payload.message.content.payload;

      switch (buttonPayload) {
        case 'form':
          await sendForm(payload.conversation.id);
          break;

        case 'agent':
          await passControlToZendesk(payload.conversation.id, payload.message.content.text);
          await sendMessage(payload.conversation.id, {
            type: 'text',
            text: 'Connecting you with an agent. Please wait a moment...'
          });
          break;

        case 'answerbot':
          await passControlToAnswerBot(payload.conversation.id, payload.message.content.text);
          await sendMessage(payload.conversation.id, {
            type: 'text',
            text: 'Connecting you with an answerbot. Please wait a moment...'
          });
          break;

        default:
          // Optional: handle non-button messages
          /*await sendMessage(payload.conversation.id, {
            type: 'text',
            text: `Thank you for submitting your message. Your message was ${payload.message.content.text}`
          });*/
          break;
      }
    }

    res.sendStatus(200);
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

async function passControlToZendesk(conversationId, userMessage) {
  try {
    // Create Zendesk ticket first
    //   const ticket = await createZendeskTicket(conversationId, userMessage);

    // Then pass control to Zendesk integration
    await fetch(
      `${SUNSHINE_CONV_ROOT}/v2/apps/${appId}/conversations/${conversationId}/passControl`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Basic ' + Buffer.from(`${appKey}:${appSecret}`).toString('base64')
        },
        body: JSON.stringify({
          switchboardIntegration: 'zd-agentWorkspace'
          /* metadata: {
            'dataCapture.systemField.priority': 'normal',
            'dataCapture.systemField.tags': ['bot-escalation']
          } */
        })
      }
    );
  } catch (error) {
    console.error('Error in passControlToZendesk:', error);
    throw error;
  }
}

async function passControlToAnswerBot(conversationId, userMessage) {
  try {
    // Create Zendesk ticket first
    //   const ticket = await createZendeskTicket(conversationId, userMessage);

    // Then pass control to Zendesk integration
    await fetch(
      `${SUNSHINE_CONV_ROOT}/v2/apps/${appId}/conversations/${conversationId}/passControl`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Basic ' + Buffer.from(`${appKey}:${appSecret}`).toString('base64')
        },
        body: JSON.stringify({
          switchboardIntegration: 'zd-answerBot',
          metadata: {
            'zen:answerbot:execute_flow': 'channel=66e99e76648bb033cc68e402'
          }
          /* metadata: {
            'dataCapture.systemField.priority': 'normal',
            'dataCapture.systemField.tags': ['bot-escalation']
          } */
        })
      }
    );
  } catch (error) {
    console.error('Error in passControlToZendesk:', error);
    throw error;
  }
}

async function sendButtons(conversationId) {
  try {
    const response = await fetch(
      `${SUNSHINE_CONV_ROOT}/v2/apps/${appId}/conversations/${conversationId}/messages`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Basic ' + Buffer.from(`${appKey}:${appSecret}`).toString('base64')
        },
        body: JSON.stringify({
          author: {
            type: 'business'
          },
          content: {
            type: 'text',
            text: 'Choose One of the following options',
            actions: [
              {
                type: 'reply',
                text: 'Send a Form',
                payload: 'form'
              },
              {
                type: 'reply',
                text: 'Connect with an Agent',
                payload: 'agent'
              },
              {
                type: 'reply',
                text: 'Connect with Zendesk Answerbot',
                payload: 'answerbot'
              }
            ]
          }
        })
      }
    );
    const data = await response.json();
    console.log('send buttons response', data.messages[0].content);
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
}

async function sendMessage(conversationId, message) {
  try {
    await fetch(`${SUNSHINE_CONV_ROOT}/v2/apps/${appId}/conversations/${conversationId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Basic ' + Buffer.from(`${appKey}:${appSecret}`).toString('base64')
      },
      body: JSON.stringify({
        author: {
          type: 'business'
        },
        content: message
      })
    });
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
}

async function sendForm(conversationId) {
  try {
    await sendMessage(conversationId, {
      type: 'form',
      blockChatInput: true,
      fields: [
        {
          type: 'text',
          name: 'full_name',
          label: 'Your name?',
          placeholder: 'Type your name...',
          minSize: 1,
          maxSize: 30
        },
        {
          type: 'email',
          name: 'email_address',
          label: 'Your email?',
          placeholder: 'email@example.com'
        },
        {
          type: 'select',
          name: 'language',
          label: 'Language',
          placeholder: 'Choose your language...',
          options: [
            {
              name: 'english',
              label: 'English'
            },
            {
              name: 'spanish',
              label: 'Spanish'
            },
            {
              name: 'japanese',
              label: 'Japanese'
            }
          ]
        }
      ]
    });
  } catch (error) {
    console.error('Error sending form:', error);
    throw error;
  }
}

// Add a health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    sunshine: {
      root: SUNSHINE_CONV_ROOT,
      appId: appId ? 'configured' : 'missing'
    },
    zendesk: {
      subdomain: process.env.ZENDESK_SUBDOMAIN ? 'configured' : 'missing',
      api: process.env.ZENDESK_API_TOKEN ? 'configured' : 'missing'
    }
  });
});

const PORT = process.env.PORT || 3000;

// Error handling for uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (error) => {
  console.error('Unhandled Rejection:', error);
});

app.listen(PORT, () => {
  console.log(`Webhook server running on port ${PORT}`);
});
