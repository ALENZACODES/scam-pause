// The warning signs. Each one is a plain rule with its words, a weight, an explanation
// and a source, so every flag the app raises can be read and checked.
// weight: 1 context, 2 caution, 3 strong, 4 very strong, 5 almost never legitimate.
const W = (s) => new RegExp(s, "gi");
export const SIGNALS = [
  // How they pay: the payment methods real organisations do not demand.
  { id: "giftcards", group: "pay", weight: 5, label: "Asks for gift cards", why: "No government office, bank or real business takes payment in gift cards. Once you share the numbers, the money is gone.", source: "cra",
    rx: [W("\\b(gift ?cards?|google ?play cards?|apple (gift )?cards?|itunes cards?|steam cards?|prepaid (credit |visa )?cards?)\\b"), W("\\bscratch (off )?(the )?(back|silver|panel)\\b"), W("\\bcard numbers? and (the )?pin\\b")] },
  { id: "crypto", group: "pay", weight: 4, label: "Asks for cryptocurrency", why: "Crypto payments almost can't be reversed. The CRA does not take crypto, and no government agency asks for it.", source: "invest",
    rx: [W("\\b(bitcoin|crypto(currency|currencies)?|btc|usdt|tether|ethereum)\\b"), W("\\b(coin|crypto|bitcoin|btc) (atm|machine|terminal)s?\\b"), W("\\bwallet address\\b")] },
  { id: "cash", group: "pay", weight: 4, label: "Cash, courier or money transfer", why: "Asking for cash picked up at your door, cash in the mail, or a wire through a money transfer service is a classic scam step.", source: "emergency",
    rx: [W("\\b(send|mail|bring|withdraw) (the )?cash\\b"), W("\\bcash in (an |the )?(envelope|mail)\\b"), W("\\bcourier (will|is going to|can) (come|pick|collect|stop by)"), W("\\b(western union|moneygram|wire (transfer|the money|it))\\b")] },
  { id: "safeaccount", group: "pay", weight: 5, label: "Move money to a \"safe\" account", why: "Banks and police never ask you to move money to another account to protect it. This is the bank investigator scam.", source: "bank",
    rx: [W("\\b(safe|secure|safety|protected|holding|new) account\\b"), W("\\bmove (all )?(your |the )?(money|funds|savings)\\b"), W("\\btransfer (all )?(your |the )?(money|funds|savings) (to|into)\\b")] },
  { id: "etransfer", group: "pay", weight: 1, label: "Mentions an e-Transfer", why: "Real e-Transfers are normal, but the CRA does not send refunds by e-Transfer or text, and scammers use fake deposit notices to steal bank logins.", source: "cra",
    rx: [W("\\b(e-?transfers?|interac)\\b")] },
  { id: "askmoney", group: "pay", weight: 1, label: "Asks for money", why: "Any request for money from someone you can't see deserves a check with a number you already have.", source: "emergency",
    rx: [W("\\b(send|lend|wire|transfer|e-?transfer|give) (me |us )?(some |the )?(money|funds|\\$\\s?\\d[\\d,]*)"), W("\\b(need|needs|owe|owing|pay) (\\$\\s?\\d[\\d,]*|money|the money|the balance|the amount)\\b"), W("\\bpay (it|this|them|now|today)\\b")] },
  { id: "fee", group: "pay", weight: 3, label: "Pay a fee to get money or a delivery", why: "A fee up front to release a parcel, unlock earnings, start a job or recover lost money is a common hook.", source: "job",
    rx: [W("\\b(pay|send|deposit) (a |the |an? small )?(\\$?\\d+(\\.\\d\\d)? )?(fee|deposit|duty|charge|payment) (to|before|so)\\b"), W("\\b(release|redeliver|unlock|upgrade|activate) (your |the )?(parcel|package|delivery|account|earnings|commission|level|withdrawal)"), W("\\b(unpaid|outstanding) (shipping|delivery|customs) (fee|charge)s?\\b"), W("\\b(processing|release|redelivery|customs|unlock) fee\\b")] },

  // What they ask you to do.
  { id: "code", group: "ask", weight: 5, label: "Asks for a code sent to you", why: "A code texted or emailed to you is the key to your account. Your bank will never ask you to read it back.", source: "bank",
    rx: [W("\\b(read|send|give|tell|share|forward|provide) (me |us )?(back )?(the |your |that )?(\\d-digit |6 digit |six digit )?(verification |security |one[- ]time |access |authentication |confirmation |2fa |otp )?(code|passcode|pin)\\b"), W("\\bcode (we|i|that we|you) (just )?(sent|texted|received|got)\\b"), W("\\bwhat('s| is) the code\\b")],
    unless: /\b(do not|don't|never|no one will|we will never|will never)\b[^.]{0,40}$/i },
  { id: "remote", group: "ask", weight: 4, label: "Wants remote access to your device", why: "Letting someone control your computer or phone gives them your bank and email. Never allow remote access to a caller.", source: "bank",
    rx: [W("\\b(anydesk|teamviewer|quick ?support|rustdesk|remote (access|desktop|control|support))\\b"), W("\\b(download|install) (this|the|our|an) (app|software|program|tool)\\b"), W("\\bshare (your )?screen\\b")] },
  { id: "cardpickup", group: "ask", weight: 5, label: "Wants to collect your card", why: "Banks and police never send someone to your home to pick up your bank card, or ask you to cut it up first.", source: "bank",
    rx: [W("\\b(pick up|collect|hand over|give|send) (us |me )?your (bank |debit |credit )?cards?\\b"), W("\\bcut (the |your )?card\\b"), W("\\bcards? (will be|to be) (picked up|collected)\\b")] },
  { id: "personal", group: "ask", weight: 2, label: "Asks for personal or banking details", why: "Your SIN, date of birth, passwords and card numbers let someone take over accounts in your name.", source: "cra",
    rx: [W("\\b(sin|social insurance number|date of birth|mother'?s maiden name)\\b"), W("\\b(banking|bank|login|online banking|card|account) (details|information|info|credentials|number|password)\\b"), W("\\b(verify|confirm|update|validate) (your )?(identity|details|account|information|info|payment)\\b"), W("\\bpassword\\b")] },
  { id: "reply", group: "ask", weight: 1, label: "Asks you to reply or call back a number", why: "Scammers give their own callback number. Use one you already have.", source: "emergency",
    rx: [W("\\b(reply|text back|respond) (with )?(\"|')?(y|yes|help|1|stop)\\b"), W("\\b(call|contact) (us|me|this number|back) (at|on)\\b"), W("\\bcall (this|the) number\\b")] },

  // How they pressure you.
  { id: "urgent", group: "pressure", weight: 2, label: "Rushes you", why: "Urgency is there to stop you thinking or checking. A real problem can wait ten minutes.", source: "emergency",
    rx: [W("\\b(urgent(ly)?|immediately|right away|right now|as soon as possible|asap|act now|final (notice|warning|reminder)|last (chance|warning)|today only|before it'?s too late)\\b"), W("\\bwithin (the next )?(\\d+|one|two|twenty[- ]four|twenty|forty[- ]eight) (hours?|minutes?|hrs?|mins?)\\b"), W("\\b(expires?|ends?|deadline) (today|tonight|in \\d+)"), W("\\bmust\\b[^.!?]{0,50}\\b(today|tonight|now)\\b")] },
  { id: "threat", group: "pressure", weight: 3, label: "Threatens you", why: "The CRA, banks and police do not threaten arrest, deportation or jail over the phone or by text.", source: "cra",
    rx: [W("\\b(arrest(ed)?|warrant|deport(ed|ation)?|jail|prison|criminal charges?|legal action|lawsuit|court case)\\b"), W("\\b(account|card|sin|number) (will be |has been |is )?(suspended|frozen|locked|blocked|closed|cancelled|compromised)\\b"), W("\\b(suspend|freeze|lock|block|close|cancel) your (account|card|sin)\\b")] },
  { id: "secret", group: "pressure", weight: 4, label: "Tells you to keep it secret", why: "Being told not to tell your family or your bank is one of the clearest signs. Real investigations never need your silence.", source: "emergency",
    rx: [W("\\b(don'?t|do not|please don'?t) (tell|talk to|mention (this|it) to|call|contact|involve) (anyone|anybody|mom|dad|(the |your )(bank|family|kids|son|daughter|wife|husband|branch|teller|staff|branch staff))"), W("\\bkeep (this|it) (between us|secret|confidential|quiet|to yourself)\\b"), W("\\bgag order\\b"), W("\\b(tell|say to) the (bank|teller)[^.]{0,30}(renovation|gift|vacation|car)\\b"), W("\\bconfidential investigation\\b")] },
  { id: "stayon", group: "pressure", weight: 4, label: "Keeps you on the phone", why: "Keeping you on the line stops you from checking with anyone. Scammers can even hold a line open after you hang up, so call back from another phone or wait ten minutes.", source: "bank",
    rx: [W("\\b(stay|remain) on the (line|phone)\\b"), W("\\b(don'?t|do not) hang up\\b"), W("\\bkeep (me|us|the call) on (speaker|the line)\\b")] },
  { id: "toogood", group: "pressure", weight: 3, label: "Promises easy or guaranteed money", why: "Guaranteed or very high returns, or high pay for little work, are the hook in investment and job scams.", source: "invest",
    rx: [W("\\b(guaranteed|risk[- ]free|no risk) (returns?|profits?|income|earnings)\\b"), W("\\b(double|triple) your (money|investment)\\b"), W("\\b\\d{2,3}% (returns?|profit|gains?|interest|daily|weekly|a (week|day|month)|per (week|day|month))\\b"), W("\\bearn (up to )?\\$\\d[\\d,]* (a|per) (day|week|hour)\\b"), W("\\b(easy|fast|quick) (money|cash|income)\\b"), W("\\bpassive income\\b")] },
  { id: "prize", group: "pressure", weight: 2, label: "Says you won or were selected", why: "Prizes you never entered for are bait.", source: "top",
    rx: [W("\\b(you('ve| have) (won|been selected)|congratulations[,!]? you|claim your (prize|reward|gift|refund)|lucky winner)\\b")] },

  // Who they say they are. Alone these are normal; with the signs above they form a known story.
  { id: "as_cra", group: "who", weight: 1, label: "Says it is the CRA or the government", why: "The CRA does not text you links, ask for payment by e-Transfer, gift cards or crypto, or threaten arrest.", source: "cra",
    rx: [W("\\b(cra|canada revenue( agency)?|revenue agency|service canada|government of canada|tax (debt|owing|refund|return)|gst(/hst)? (credit|refund)|benefit payment|carbon rebate|grocery rebate)\\b")] },
  { id: "as_bank", group: "who", weight: 1, label: "Says it is your bank", why: "Hang up and call the number on the back of your card, from a different phone if you can.", source: "bank",
    rx: [W("\\b(rbc|royal bank|td( bank| canada trust)?|scotiabank|bmo|bank of montreal|cibc|desjardins|tangerine|national bank|simplii|eq bank)\\b"), W("\\b(bank'?s?|card) (fraud|security) (department|team|unit|services)\\b"), W("\\b(fraud|bank) investigator\\b"), W("\\byour bank\\b")] },
  { id: "as_police", group: "who", weight: 1, label: "Says it is the police", why: "Police do not ask for money, cards or secrecy over the phone. Call your local police yourself.", source: "emergency",
    rx: [W("\\b(rcmp|police (officer|department|service)|detective|constable|sergeant|law enforcement|toronto police|opp)\\b")] },
  { id: "as_post", group: "who", weight: 1, label: "Says it is a delivery company", why: "Canada Post never texts or emails asking for payment to release or track a delivery. Real texts come only from 272727 or 55555, and only if you signed up.", source: "post",
    rx: [W("\\b(canada ?post|purolator|ups|fedex|dhl|postes canada)\\b"), W("\\b(parcel|package|shipment|delivery) (is |has been |was )?(on hold|held|pending|failed|returned|suspended|could not be delivered)"), W("\\b(redelivery|delivery attempt|address (is )?incomplete|incomplete address)\\b")] },
  { id: "as_family", group: "who", weight: 2, label: "A family member in trouble, or a new number", why: "Scammers pose as a grandchild or child with a broken phone, an accident or bail. Call them on the number you already have.", source: "emergency",
    rx: [W("\\b(hi |hey )?(mom|mum|dad|grandma|grandpa|nana|papa|auntie)\\b[,!. ]"), W("\\b(it'?s me|this is your (grandson|granddaughter|son|daughter))\\b"), W("\\b(new (phone )?number|broke my phone|dropped my phone|phone (is )?broken|phone (fell|went) in)\\b"), W("\\b(bail|in jail|been arrested|car accident|in the hospital|lawyer'?s? fees?)\\b")] },
  { id: "as_job", group: "who", weight: 1, label: "A job offer you didn't apply for", why: "Task jobs that ask you to boost products or pay to unlock earnings are a fast growing scam.", source: "job",
    rx: [W("\\b(work from home|remote (job|position|work)|part[- ]time (job|position|work)|flexible hours|recruiter|hr (team|department)|hiring)\\b"), W("\\b(boost(ing)? (products|apps|videos)|tasks? (per|a) day|complete (simple )?tasks|order tasks|optimi[sz]e (products|apps))\\b"), W("\\b(commission|daily (pay|salary|income))\\b")] },
  { id: "as_invest", group: "who", weight: 1, label: "An investment or trading pitch", why: "Unsolicited investment tips, especially from a new online friend, are how romance and crypto investment scams start.", source: "invest",
    rx: [W("\\b(trading (platform|app|account)|investment (opportunity|platform|plan)|forex|mining pool|liquidity|insider|my (uncle|mentor|aunt) (taught|showed)|financial (advisor|mentor))\\b")] },
  { id: "as_recovery", group: "who", weight: 2, label: "Offers to recover money you lost", why: "Recovery pitches target people who already lost money, and ask for a fee or remote access. Nobody legitimate charges up front to get your money back.", source: "invest",
    rx: [W("\\b(recover(y)? (of )?(your )?(lost )?(funds|money|crypto|investment)|get your (money|funds) back|funds recovery|recovery (agent|service|team|firm))\\b")] },
];
export const GROUPS = { pay: "How they want to be paid", ask: "What they ask you to do", pressure: "How they pressure you", who: "Who they say they are" };
