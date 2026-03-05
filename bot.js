const TelegramBot = require('node-telegram-bot-api');

// ==========================================
// --- SYSTÈME ANTI-SOMMEIL POUR RENDER ---
// ==========================================
const http = require('http');
const port = process.env.PORT || 3000;

const server = http.createServer((req, res) => {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/plain');
    res.end('Bot en ligne et fonctionnel !');
});

server.listen(port, '0.0.0.0', () => {
    console.log(`Serveur web allumé sur le port ${port}`);
});

// ==========================================
// --- 1. CONFIGURATION DU BOT ---
// ==========================================
const token = process.env.TELEGRAM_TOKEN;

// ⚠️ METS L'ID DE TON GROUPE ICI (N'oublie pas le tiret -)
const idGroupeLivreurs = '-1003875486875'; 

const webAppUrl = 'https://iloav2345-hash.github.io/telegram-boutique/'; 

const bot = new TelegramBot(token, {polling: true});

// ==========================================
// --- 2. COMMANDE /START ---
// ==========================================
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    
    const messageBienvenue = 
        "👋 *Bienvenue chez CapBdv !*\n\n" +
        "Découvrez nos produits *exclusif* en direct. 🍫❄️\n" +
        "Livraison *rapide* et *discrète* garanties 🤝\n\n" +
        "La mini app gère tout, choisissez vos produits et validez le panier ✅\n\n" +
        "On vous envoie un message pour vous indiquer l'heure et quand la commande est prête !📦\n\n" +
        "👇 *Cliquez sur le bouton ci-dessous pour ouvrir le menu :*";

    bot.sendMessage(chatId, messageBienvenue, {
        parse_mode: 'Markdown',
        reply_markup: {
            keyboard: [
                [{text: "Ouvrir la Boutique 🛍️", web_app: {url: webAppUrl}}]
            ],
            resize_keyboard: true
        }
    });
});

// ==========================================
// --- 3. RÉCEPTION DE LA COMMANDE ---
// ==========================================
bot.on('message', async (msg) => {
    if (msg.web_app_data && msg.web_app_data.data) {
        try {
            const data = JSON.parse(msg.web_app_data.data);
            const chatId = msg.chat.id; 
            
            const articles = data.articles; 
            const infosClient = data.infosClient; 
            const methodePaiement = data.methodePaiement; 
            
            let listeArticles = "";
            let total = 0;

            articles.forEach(item => {
                listeArticles += `- ${item.name} (x1) : ${item.price}€\n`;
                total += item.price;
            });

            let texteInfo = infosClient ? infosClient : "Non renseignée";
            let instructionsPaiement = "";

            if (methodePaiement === "Crypto") {
                instructionsPaiement = "🪙 *Instructions pour la Crypto :*\n" +
                                       "Veuillez envoyer le montant exact (USDT/BTC) à cette adresse :\n" +
                                       "`Bientot`\n\n" +
                                       "Une fois le transfert effectué, envoyez-moi une capture d'écran à @SouPoudreuz.";
            } else if (methodePaiement === "Carte Bancaire") {
                instructionsPaiement = "💳 *Instructions pour la Carte Bancaire :*\n" +
                                       "Veuillez vous rendre sur notre site partenaire pour régler : [Lien du site](https://www.bitpay.com/buy-crypto)\n\n" +
                                       "*Comment faire ?*\n" +
                                       "1. Allez sur le site.\n" +
                                       "2. Ecrivez un montant de " + total + "€.\n" +
                                       "3. Payez par CB et choisissez l'option simplex après avoir cliqué sur choisir l'offre.";
            } else {
                instructionsPaiement = "💵 *Instructions pour les Espèces :*\n" +
                                       "Merci de préparer l'appoint si possible lors de la livraison.";
            }

            // A) Message POUR LE CLIENT
            let messageAcheteur = `📝 *Résumé de votre commande :*\n\n${listeArticles}\n*Total : ${total}€*\n\n📍 *Adresse :* ${texteInfo}\n💳 *Paiement choisi :* ${methodePaiement}\n\n${instructionsPaiement}\n\nNous cherchons un livreur disponible... ⏳`;
            await bot.sendMessage(chatId, messageAcheteur, {parse_mode: 'Markdown'});

            // B) Message POUR LE GROUPE DES LIVREURS (Le QG)
            let pseudoClient = msg.from.username ? `@${msg.from.username}` : msg.from.first_name;
            let messagePourLeGroupe = `🚨 NOUVELLE COMMANDE !\n\n` +
                                 `👤 Client : ${pseudoClient}\n` +
                                 `📍 Adresse : ${texteInfo}\n` +
                                 `💳 Paiement : ${methodePaiement}\n\n` +
                                 `🛒 PANIER :\n${listeArticles}\n` +
                                 `💰 TOTAL : ${total}€`;
            
            // Envoi au groupe avec les DEUX boutons
            await bot.sendMessage(idGroupeLivreurs, messagePourLeGroupe, {
                reply_markup: {
                    inline_keyboard: [
                        [{ text: "✋ Je prends la course !", callback_data: `take_${chatId}` }],
                        [{ text: "❌ Annuler la commande", callback_data: `cancel_${chatId}` }]
                    ]
                }
            });

        } catch (e) {
            console.error("Erreur de traitement :", e);
        }
    }
});

// ==========================================
// --- 4. GESTION DES BOUTONS LIVREURS ---
// ==========================================
bot.on('callback_query', (query) => {
    const action = query.data.split('_')[0]; 
    const idClient = query.data.split('_')[1]; 
    const nomLivreur = query.from.first_name;

    if (action === 'take') {
        bot.sendMessage(idClient, `🛵 Bonne nouvelle ! Notre livreur ${nomLivreur} a pris en charge votre commande et est en route vers vous !`);

        const nouveauTexte = query.message.text + `\n\n➖➖➖➖➖➖\n🛵 Prise en charge par : ${nomLivreur}`;
        bot.editMessageText(nouveauTexte, {
            chat_id: query.message.chat.id,
            message_id: query.message.message_id,
            reply_markup: {
                inline_keyboard: [
                    [{ text: "✅ Marquer comme Livré", callback_data: `done_${idClient}` }]
                ]
            }
        });
        
        bot.answerCallbackQuery(query.id, { text: "C'est noté ! Fais bonne route 🛵" });

    } else if (action === 'done') {
        bot.sendMessage(idClient, `✅ Votre commande a été livrée ! Merci pour votre confiance et à très vite !`);

        const texteFinal = query.message.text + `\n✅ LIVRAISON TERMINÉE`;
        bot.editMessageText(texteFinal, {
            chat_id: query.message.chat.id,
            message_id: query.message.message_id
        });
        
        bot.answerCallbackQuery(query.id, { text: "Bien joué chef ! 👏" });

    } else if (action === 'cancel') {
        // Le client est prévenu de l'annulation
        bot.sendMessage(idClient, `❌ Votre commande a été annulée. Si c'est une erreur, n'hésitez pas à nous contacter !`);

        // Le message s'autodétruit dans le groupe des livreurs
        bot.deleteMessage(query.message.chat.id, query.message.message_id)
            .catch(err => console.log("Erreur de suppression :", err));
        
        bot.answerCallbackQuery(query.id, { text: "Commande annulée et supprimée ! 🗑️" });
    }
});

console.log("✅ Le bot est prêt et écoute les commandes !");
