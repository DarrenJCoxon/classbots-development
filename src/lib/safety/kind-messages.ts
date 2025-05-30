// Kind but firm messages for content filtering and moderation
// These messages are designed to be educational and encouraging while maintaining safety

export const CONTENT_FILTER_MESSAGES = {
  // Personal information filters
  phone_number: "I noticed you tried to share a phone number. To keep you safe online, I can't process messages with personal contact information. Let's focus on your learning instead! 📱➡️📚",
  
  email_address: "Oops! Looks like you included an email address. For your safety, I can't accept personal contact details. What subject would you like help with today? 📧➡️🎓",
  
  physical_address: "Hold on! I spotted what looks like an address. Your safety is important, so please don't share location details online. How can I help with your studies? 🏠➡️📖",
  
  social_media: "I see you mentioned social media! While those platforms can be fun, let's keep our focus here on learning. What topic are you working on? 💬➡️🧠",
  
  age_information: "Thanks for sharing, but I don't need to know personal details like your age. I'm here to help you learn, no matter what! What questions do you have? 🎂➡️❓",
  
  school_name: "I noticed you mentioned a specific school. For privacy, let's keep those details private. What subject can I help you with? 🏫➡️📚",
  
  teacher_name: "You mentioned a teacher's name - let's keep their privacy protected too! What are you learning about in class? 👩‍🏫➡️📝",
  
  location_information: "Whoops! That looked like location information. Stay safe by keeping where you are private. What would you like to learn about instead? 📍➡️🌟",
  
  // Default personal info message
  personal_info_default: "I noticed you tried to share some personal information. To keep you safe online, I can't process messages with personal details. Let's focus on learning together! 🛡️📚"
};

export const AI_MODERATION_MESSAGES = {
  // Inappropriate content
  general_inappropriate: "Hey there! Let's keep our conversation positive and focused on learning. I'm here to help you with your studies - please try rephrasing your question in a respectful way. 📚✨",
  
  // Jailbreak attempts
  jailbreak: "I see you're trying to test my boundaries! 🤖 I'm designed to be your learning assistant, so let's stick to educational topics. What subject would you like help with today?",
  
  jailbreak_creative: "Nice try! You're clearly creative and curious - let's channel that energy into learning something amazing! What topic interests you most? 🎨🧪",
  
  // Harassment/bullying
  harassment: "Let's be kind to each other! 💙 This is a space for learning and growing together. I'm here to help with your studies - what would you like to learn about?",
  
  bullying: "Hey, words can hurt! Let's create a positive learning environment for everyone. I'm here to help you succeed - what can we work on together? 🤝📖",
  
  // Hate speech
  hate_speech: "Whoa there! Everyone deserves respect, no matter their differences. Let's focus on what brings us together - learning! What subject interests you? 🌈📚",
  
  // High severity
  high_severity: "That message contained some content we can't allow here. Remember, this is a safe learning space for everyone. Your teacher has been notified, but you can still ask me educational questions! 🛡️",
  
  // Academic cheating
  homework_cheating: "I can help you understand your homework, but I can't do it for you! Learning happens when YOU work through problems. What part are you stuck on? Let's figure it out together! 💪📝",
  
  test_cheating: "Tests are your chance to show what you've learned! I can help you study and understand concepts, but the answers need to come from you. What topic should we review? 🎯📖",
  
  // Violence (non-crisis)
  violence_general: "Let's keep things peaceful here! Violence isn't the answer. How about we channel that energy into learning something cool instead? 🕊️✨",
  
  // Profanity (mild)
  mild_profanity: "Oops! Let's keep our language school-appropriate. I know you can express yourself without those words. What's on your mind? 😊💬",
  
  // System manipulation
  role_manipulation: "I'm your friendly learning assistant, and that's the role I'm happiest in! I can't pretend to be something else, but I CAN help you learn amazing things. What shall we explore? 🎭➡️📚"
};

// Function to get appropriate message based on filter reason
export function getKindFilterMessage(reason: string): string {
  // Check for specific reasons
  if (reason.includes('phone')) return CONTENT_FILTER_MESSAGES.phone_number;
  if (reason.includes('email')) return CONTENT_FILTER_MESSAGES.email_address;
  if (reason.includes('address')) return CONTENT_FILTER_MESSAGES.physical_address;
  if (reason.includes('social media')) return CONTENT_FILTER_MESSAGES.social_media;
  if (reason.includes('age')) return CONTENT_FILTER_MESSAGES.age_information;
  if (reason.includes('school name')) return CONTENT_FILTER_MESSAGES.school_name;
  if (reason.includes('teacher name')) return CONTENT_FILTER_MESSAGES.teacher_name;
  if (reason.includes('location')) return CONTENT_FILTER_MESSAGES.location_information;
  
  // Default
  return CONTENT_FILTER_MESSAGES.personal_info_default;
}

// Function to get appropriate AI moderation message
export function getKindModerationMessage(categories: string[], severity: string, jailbreakDetected: boolean): string {
  // Priority order for message selection
  if (jailbreakDetected) {
    // Alternate between different jailbreak messages for variety
    return Math.random() > 0.5 ? AI_MODERATION_MESSAGES.jailbreak : AI_MODERATION_MESSAGES.jailbreak_creative;
  }
  
  if (severity === 'high') {
    return AI_MODERATION_MESSAGES.high_severity;
  }
  
  if (categories.includes('harassment')) {
    return Math.random() > 0.5 ? AI_MODERATION_MESSAGES.harassment : AI_MODERATION_MESSAGES.bullying;
  }
  
  if (categories.includes('hate')) {
    return AI_MODERATION_MESSAGES.hate_speech;
  }
  
  if (categories.includes('violence')) {
    return AI_MODERATION_MESSAGES.violence_general;
  }
  
  if (categories.includes('academic_cheating')) {
    return Math.random() > 0.5 ? AI_MODERATION_MESSAGES.homework_cheating : AI_MODERATION_MESSAGES.test_cheating;
  }
  
  // Default
  return AI_MODERATION_MESSAGES.general_inappropriate;
}