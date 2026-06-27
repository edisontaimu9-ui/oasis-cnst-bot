export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Health check
    if (url.pathname === '/') {
      return new Response('Thanzi Nutrition Bot is running 🇲🇼', { status: 200 });
    }

    // Only handle /webhook path
    if (url.pathname !== '/webhook') {
      return new Response('Not Found', { status: 404 });
    }

    // ── GET: Meta webhook verification ──────────────────────────────
    if (request.method === 'GET') {
      const mode      = url.searchParams.get('hub.mode');
      const token     = url.searchParams.get('hub.verify_token');
      const challenge = url.searchParams.get('hub.challenge');

      if (mode === 'subscribe' && token === env.VERIFY_TOKEN) {
        console.log('Webhook verified successfully');
        return new Response(challenge, { status: 200 });
      }
      return new Response('Forbidden', { status: 403 });
    }

    // ── POST: Incoming WhatsApp messages ────────────────────────────
    if (request.method === 'POST') {
      try {
        const body = await request.json();

        const message = body.entry?.[0]
          ?.changes?.[0]
          ?.value?.messages?.[0];

        // Ignore non-text messages (images, audio, etc.)
        if (!message || message.type !== 'text') {
          return new Response('OK', { status: 200 });
        }

        const from = message.from;
        const text = message.text.body.trim();

        console.log(`Message from ${from}: ${text}`);

        // Handle commands
        const reply = await handleMessage(text, env);
        await sendWhatsAppMessage(from, reply, env);

      } catch (err) {
        console.error('Webhook error:', err.message);
      }

      // Always return 200 to Meta
      return new Response('OK', { status: 200 });
    }

    return new Response('Method Not Allowed', { status: 405 });
  }
};

// ── Message Router ───────────────────────────────────────────────────
async function handleMessage(text, env) {
  const lower = text.toLowerCase();

  // Help command
  if (lower === 'help' || lower === 'hi' || lower === 'hello') {
    return `👋 *Moni! I'm Thandizo* 🇲🇼\n\nYour Malawian nutrition assistant.\n\n*How to use:*\nJust type any food name and I'll give you its nutritional information.\n\n*Examples:*\n• nkhwani\n• nsima\n• matemba\n• beans\n• orange\n\nType *list* to see available foods.`;
  }

  // List command
  if (lower === 'list') {
    return `📋 *Common Malawian Foods I Know:*\n\n🌿 Nkhwani (pumpkin leaves)\n🍚 Nsima\n🐟 Matemba (dried fish)\n🫘 Beans\n🥜 Groundnuts\n🍌 Banana\n🍊 Orange\n🥬 Rape (rapeseed leaves)\n🍠 Sweet potato\n🌽 Maize\n\n_Type any food name to get nutrition info_`;
  }

  // Food search
  return await searchFood(text, env);
}

// ── MalawiNutrient API Search ────────────────────────────────────────
async function searchFood(query, env) {
  try {
    const res = await fetch(
      `${env.MFDC_API}/foods/search?q=${encodeURIComponent(query)}`,
      {
        headers: { 'Content-Type': 'application/json' }
      }
    );

    if (!res.ok) {
      return `⚠️ Sorry, I couldn't find *"${query}"*.\n\nType *help* to see examples.`;
    }

    const data = await res.json();
    const foods = Array.isArray(data) ? data : (data.foods || data.results || []);

    if (!foods || foods.length === 0) {
      return `🔍 No results for *"${query}"*.\n\nTry: nkhwani, nsima, beans, matemba\n\nType *list* for more options.`;
    }

    return formatNutritionReply(foods[0], query);

  } catch (err) {
    console.error('API error:', err.message);
    return `⚠️ Service temporarily unavailable. Please try again shortly.`;
  }
}

// ── Format Nutrition Response ────────────────────────────────────────
function formatNutritionReply(food, query) {
  const name    = food.name || food.food_name || food.description || query;
  const serving = food.serving_size || food.portion || '100g';

  let msg = `🥗 *${name}*\nPer ${serving}\n`;
  msg += `─────────────────\n`;

  const nutrients = [
    { keys: ['energy', 'calories', 'energy_kcal'],          label: '🔥 Energy',     unit: 'kcal' },
    { keys: ['protein', 'protein_g'],                        label: '💪 Protein',    unit: 'g'    },
    { keys: ['carbohydrates', 'carbs', 'carbohydrate_g'],   label: '🌾 Carbs',      unit: 'g'    },
    { keys: ['fat', 'total_fat', 'fat_g'],                  label: '🫒 Fat',        unit: 'g'    },
    { keys: ['fiber', 'dietary_fiber', 'fibre'],            label: '🌿 Fibre',      unit: 'g'    },
    { keys: ['iron', 'iron_mg'],                            label: '🩸 Iron',       unit: 'mg'   },
    { keys: ['calcium', 'calcium_mg'],                      label: '🦴 Calcium',    unit: 'mg'   },
    { keys: ['vitamin_c', 'vitaminc', 'vitamin_c_mg'],      label: '🍊 Vitamin C',  unit: 'mg'   },
    { keys: ['zinc', 'zinc_mg'],                            label: '⚡ Zinc',       unit: 'mg'   },
    { keys: ['vitamin_a', 'vitamin_a_mcg'],                 label: '👁️ Vitamin A',  unit: 'mcg'  },
  ];

  let found = 0;
  for (const n of nutrients) {
    let val = null;
    for (const key of n.keys) {
      val = food[key] ?? food.nutrients?.[key];
      if (val != null) break;
    }
    if (val != null) {
      msg += `${n.label}: *${val}${n.unit}*\n`;
      found++;
    }
  }

  if (found === 0) {
    msg += `_Detailed nutrients not available for this food_\n`;
  }

  msg += `─────────────────\n`;
  msg += `_MalawiNutrient API 🇲🇼_`;

  return msg;
}

// ── Send WhatsApp Message ────────────────────────────────────────────
async function sendWhatsAppMessage(to, text, env) {
  const res = await fetch(
    `https://graph.facebook.com/v19.0/${env.PHONE_NUMBER_ID}/messages`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.WHATSAPP_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: { body: text }
      })
    }
  );

  if (!res.ok) {
    const err = await res.text();
    console.error('WhatsApp send error:', err);
  }
}
