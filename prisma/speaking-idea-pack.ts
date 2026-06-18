import type { Prisma } from "@prisma/client";

export type SeedSpeakingIdea = {
  title: string;
  shortLabel: string;
  descriptionVi: string;
  descriptionEn: string;
  popularityScore: number;
  reuseScore: number;
  variants: Array<{
    bandLevel: number;
    phrase: string;
    exampleSentence: string;
  }>;
  supports: Array<{
    supportType: Prisma.SpeakingIdeaSupportCreateWithoutIdeaInput["supportType"];
    text: string;
    example?: string | null;
  }>;
  patterns: Array<{
    patternText: string;
    exampleAnswer: string;
    variablesJson?: Prisma.InputJsonValue | null;
  }>;
  exampleQuestions: string[];
};

function createIdea(input: SeedSpeakingIdea) {
  return input;
}

export const INITIAL_SPEAKING_IDEA_PACK_VERSION = "seed-idea-pack-v1";

export const INITIAL_SPEAKING_IDEA_PACK: SeedSpeakingIdea[] = [
  createIdea({
    title: "Convenience and saving time",
    shortLabel: "Save time",
    descriptionVi:
      "Y tuong nay dung khi muon giai thich vi sao nguoi ta chon mot san pham, dich vu, thoi quen hoac cong nghe vi no tien loi va giup tiet kiem thoi gian trong cuoc song hang ngay.",
    descriptionEn:
      "Use this idea when explaining that people prefer something because it is convenient and helps them save time in daily life.",
    popularityScore: 5,
    reuseScore: 5,
    variants: [
      {
        bandLevel: 5.5,
        phrase: "save time",
        exampleSentence: "Online shopping is popular because it helps people save time.",
      },
      {
        bandLevel: 6.5,
        phrase: "make everyday tasks more convenient",
        exampleSentence:
          "Mobile banking makes everyday tasks more convenient for busy adults.",
      },
      {
        bandLevel: 7.5,
        phrase: "streamline daily routines",
        exampleSentence:
          "Digital tools can streamline daily routines and reduce unnecessary effort.",
      },
    ],
    supports: [
      {
        supportType: "REASON",
        text: "People often choose the quickest option because modern life is busy and they want to reduce wasted time.",
        example: "That is why many commuters prefer the metro to driving in rush hour.",
      },
      {
        supportType: "RESULT",
        text: "Saving time gives people more room for work, rest, and family activities.",
        example: "If a service is fast, people are more likely to keep using it.",
      },
    ],
    patterns: [
      {
        patternText: "People tend to choose X mainly because it saves them time and makes life easier.",
        exampleAnswer:
          "People tend to choose online services mainly because they save time and make life easier, especially when they have a packed schedule.",
      },
    ],
    exampleQuestions: [
      "Why do people shop online?",
      "Why is public transport important in cities?",
      "What makes an app popular nowadays?",
    ],
  }),
  createIdea({
    title: "Wider choice",
    shortLabel: "More options",
    descriptionVi:
      "Y tuong nay phu hop khi ban muon noi rang mot nen tang, dia diem hoac trai nghiem tot hon vi no cho nguoi ta nhieu lua chon hon.",
    descriptionEn:
      "Use this idea when you want to explain that something is attractive because it offers people more options and flexibility in decision-making.",
    popularityScore: 4,
    reuseScore: 5,
    variants: [
      {
        bandLevel: 5.5,
        phrase: "have more choices",
        exampleSentence: "People shop online because they have more choices there.",
      },
      {
        bandLevel: 6.5,
        phrase: "offer a wider range of options",
        exampleSentence: "Large cities offer a wider range of options for entertainment.",
      },
      {
        bandLevel: 7.5,
        phrase: "broaden people's choices",
        exampleSentence: "International travel can broaden people's choices in terms of lifestyle and career.",
      },
    ],
    supports: [
      {
        supportType: "REASON",
        text: "When people can compare many options, they feel more in control and can find something that suits their needs better.",
        example: "This is especially true for shopping, education, and entertainment.",
      },
      {
        supportType: "DETAIL",
        text: "A wider choice also means people can balance cost, quality, and convenience instead of accepting one fixed option.",
        example: "For example, streaming platforms let viewers choose what to watch and when to watch it.",
      },
    ],
    patterns: [
      {
        patternText: "One major advantage of X is that it gives people a much wider choice.",
        exampleAnswer:
          "One major advantage of living in a big city is that it gives people a much wider choice of jobs, schools, and leisure activities.",
      },
    ],
    exampleQuestions: [
      "Why do people like living in big cities?",
      "Why is online shopping becoming more common?",
      "What are the benefits of studying abroad?",
    ],
  }),
  createIdea({
    title: "Cost saving",
    shortLabel: "Save money",
    descriptionVi:
      "Y tuong nay dung khi mot lua chon hop ly hon vi giup giam chi phi, tranh lang phi hoac tao gia tri tot hon cho so tien bo ra.",
    descriptionEn:
      "Use this idea when something is preferred because it reduces expenses, avoids waste, or offers better value for money.",
    popularityScore: 5,
    reuseScore: 5,
    variants: [
      {
        bandLevel: 5.5,
        phrase: "save money",
        exampleSentence: "Buying second-hand items can help people save money.",
      },
      {
        bandLevel: 6.5,
        phrase: "be more affordable in the long run",
        exampleSentence: "Cycling is more affordable in the long run than driving every day.",
      },
      {
        bandLevel: 7.5,
        phrase: "reduce financial pressure",
        exampleSentence: "Working from home can reduce financial pressure by cutting transport costs.",
      },
    ],
    supports: [
      {
        supportType: "REASON",
        text: "Many people are budget-conscious, so they naturally prefer options that help them manage their money more carefully.",
        example: "Students and young families often think this way.",
      },
      {
        supportType: "RESULT",
        text: "When people save money in one area, they can spend it on other priorities such as health, education, or travel.",
        example: "This makes the option more attractive in everyday life.",
      },
    ],
    patterns: [
      {
        patternText: "Another reason people choose X is that it can save them money.",
        exampleAnswer:
          "Another reason people choose public transport is that it can save them money, especially compared with owning and maintaining a private car.",
      },
    ],
    exampleQuestions: [
      "Why do some people buy used products?",
      "Why is cycling popular in some cities?",
      "Why do many employees want to work from home?",
    ],
  }),
  createIdea({
    title: "Flexibility",
    shortLabel: "Flexible",
    descriptionVi:
      "Y tuong nay phu hop khi ban muon nhan manh rang mot viec giup nguoi ta de dang thay doi thoi gian, dia diem hoac cach thuc sao cho phu hop voi nhu cau cua ho.",
    descriptionEn:
      "Use this idea when explaining that something is valuable because it lets people adjust time, place, or method to suit their own needs.",
    popularityScore: 4,
    reuseScore: 5,
    variants: [
      {
        bandLevel: 5.5,
        phrase: "be flexible",
        exampleSentence: "Online courses are useful because they are flexible.",
      },
      {
        bandLevel: 6.5,
        phrase: "fit around a person's schedule",
        exampleSentence: "Remote work can fit around a person's schedule more easily.",
      },
      {
        bandLevel: 7.5,
        phrase: "give people greater flexibility",
        exampleSentence: "Freelance work gives people greater flexibility over how they organise their day.",
      },
    ],
    supports: [
      {
        supportType: "REASON",
        text: "People often have competing responsibilities, so they value options that can adapt to different routines.",
        example: "This matters a lot for working adults and parents.",
      },
      {
        supportType: "RESULT",
        text: "More flexibility usually leads to better balance and less frustration.",
        example: "As a result, people feel more satisfied and in control.",
      },
    ],
    patterns: [
      {
        patternText: "What I like about X is that it gives people the flexibility to do things in their own way.",
        exampleAnswer:
          "What I like about online learning is that it gives people the flexibility to study in their own way and at their own pace.",
      },
    ],
    exampleQuestions: [
      "Why do some people prefer freelancing?",
      "What are the benefits of online learning?",
      "Why is remote work attractive?",
    ],
  }),
  createIdea({
    title: "Better communication",
    shortLabel: "Communication",
    descriptionVi:
      "Y tuong nay dung khi ban muon giai thich rang mot cong cu, hoat dong hoac moi truong giup nguoi ta ket noi va trao doi y tuong de dang hon.",
    descriptionEn:
      "Use this idea when something helps people stay connected, express ideas clearly, or maintain stronger relationships.",
    popularityScore: 5,
    reuseScore: 5,
    variants: [
      {
        bandLevel: 5.5,
        phrase: "communicate more easily",
        exampleSentence: "Messaging apps help people communicate more easily.",
      },
      {
        bandLevel: 6.5,
        phrase: "stay in touch more effectively",
        exampleSentence: "Video calls let families stay in touch more effectively.",
      },
      {
        bandLevel: 7.5,
        phrase: "strengthen day-to-day communication",
        exampleSentence: "Shared workspaces can strengthen day-to-day communication among colleagues.",
      },
    ],
    supports: [
      {
        supportType: "REASON",
        text: "Good communication reduces misunderstandings and helps people coordinate more smoothly.",
        example: "This is useful at work, at school, and in family life.",
      },
      {
        supportType: "RESULT",
        text: "When communication improves, relationships usually become stronger and tasks get done faster.",
        example: "That is why communication tools are so widely used.",
      },
    ],
    patterns: [
      {
        patternText: "A key benefit of X is that it helps people communicate more effectively.",
        exampleAnswer:
          "A key benefit of social media is that it helps people communicate more effectively with friends and relatives who live far away.",
      },
    ],
    exampleQuestions: [
      "Why are smartphones important nowadays?",
      "What are the benefits of team activities?",
      "Why do many families use video calls?",
    ],
  }),
  createIdea({
    title: "Access to information",
    shortLabel: "Information access",
    descriptionVi:
      "Y tuong nay dung khi ban muon noi rang mot cong cu hoac nen tang co gia tri vi giup moi nguoi tim kiem, cap nhat va so sanh thong tin nhanh hon.",
    descriptionEn:
      "Use this idea when something is useful because it gives people fast, convenient access to knowledge, updates, or comparisons.",
    popularityScore: 5,
    reuseScore: 5,
    variants: [
      {
        bandLevel: 5.5,
        phrase: "get information quickly",
        exampleSentence: "The internet helps people get information quickly.",
      },
      {
        bandLevel: 6.5,
        phrase: "have easy access to reliable information",
        exampleSentence: "Online platforms give students easy access to reliable information.",
      },
      {
        bandLevel: 7.5,
        phrase: "gain instant access to useful information",
        exampleSentence:
          "Smart devices allow users to gain instant access to useful information wherever they are.",
      },
    ],
    supports: [
      {
        supportType: "REASON",
        text: "People make better decisions when they can compare facts and learn about different options.",
        example: "This matters for shopping, travel, health, and education.",
      },
      {
        supportType: "RESULT",
        text: "Quick access to information saves effort and increases confidence in decision-making.",
        example: "That is one reason digital tools have become essential.",
      },
    ],
    patterns: [
      {
        patternText: "The main reason X is useful is that it gives people easy access to information.",
        exampleAnswer:
          "The main reason smartphones are useful is that they give people easy access to information, whether they need directions, news, or study materials.",
      },
    ],
    exampleQuestions: [
      "Why are smartphones useful?",
      "Why do students use the internet so much?",
      "What are the benefits of online news?",
    ],
  }),
  createIdea({
    title: "Personal development",
    shortLabel: "Self growth",
    descriptionVi:
      "Y tuong nay phu hop khi cau tra loi can nhan manh rang mot trai nghiem hay thoi quen giup con nguoi truong thanh hon, hieu ban than hon va phat trien ky nang song.",
    descriptionEn:
      "Use this idea when an experience helps people mature, understand themselves better, or develop valuable life skills.",
    popularityScore: 4,
    reuseScore: 5,
    variants: [
      {
        bandLevel: 5.5,
        phrase: "help people grow",
        exampleSentence: "Travel can help people grow.",
      },
      {
        bandLevel: 6.5,
        phrase: "support personal growth",
        exampleSentence: "Volunteering can support personal growth in many ways.",
      },
      {
        bandLevel: 7.5,
        phrase: "contribute to a person's overall development",
        exampleSentence:
          "Living alone can contribute to a person's overall development and maturity.",
      },
    ],
    supports: [
      {
        supportType: "REASON",
        text: "New experiences usually challenge people, and that pushes them to become more capable and open-minded.",
        example: "For instance, travelling alone can make someone more independent.",
      },
      {
        supportType: "RESULT",
        text: "As people develop personally, they often become more confident and better at handling real-life situations.",
        example: "That is why many valuable experiences are not only enjoyable but also educational.",
      },
    ],
    patterns: [
      {
        patternText: "I think X is valuable because it helps people grow as individuals.",
        exampleAnswer:
          "I think studying abroad is valuable because it helps people grow as individuals and teaches them how to adapt to a completely new environment.",
      },
    ],
    exampleQuestions: [
      "Why do people like travelling alone?",
      "What are the benefits of volunteering?",
      "Why do some students want to study abroad?",
    ],
  }),
  createIdea({
    title: "Building confidence",
    shortLabel: "Confidence",
    descriptionVi:
      "Y tuong nay dung khi muon giai thich rang mot viec giup nguoi ta tin vao ban than, dam thu suc va thoai mai hon khi giao tiep hay lam viec.",
    descriptionEn:
      "Use this idea when something helps people trust themselves more, take initiative, or feel more comfortable interacting with others.",
    popularityScore: 4,
    reuseScore: 5,
    variants: [
      {
        bandLevel: 5.5,
        phrase: "feel more confident",
        exampleSentence: "Public speaking practice makes people feel more confident.",
      },
      {
        bandLevel: 6.5,
        phrase: "boost self-confidence",
        exampleSentence: "Learning a new skill can boost self-confidence.",
      },
      {
        bandLevel: 7.5,
        phrase: "build confidence in one's own abilities",
        exampleSentence:
          "Competitive sports can build confidence in one's own abilities over time.",
      },
    ],
    supports: [
      {
        supportType: "REASON",
        text: "When people succeed in small steps, they start believing they can handle bigger challenges.",
        example: "That process is especially important for children and teenagers.",
      },
      {
        supportType: "RESULT",
        text: "Higher confidence often leads to better communication, stronger motivation, and more willingness to try new things.",
        example: "So confidence has benefits beyond the original activity.",
      },
    ],
    patterns: [
      {
        patternText: "One important benefit of X is that it builds confidence over time.",
        exampleAnswer:
          "One important benefit of learning to play a musical instrument is that it builds confidence over time, especially when learners can see clear progress.",
      },
    ],
    exampleQuestions: [
      "Why should children learn a skill?",
      "What are the benefits of public speaking?",
      "Why do people play sports?",
    ],
  }),
  createIdea({
    title: "Reducing stress",
    shortLabel: "Less stress",
    descriptionVi:
      "Y tuong nay phu hop khi ban can giai thich vi sao mot hoat dong, noi chon hoac cong cu co loi cho suc khoe tinh than va giup nguoi ta thu gian hon.",
    descriptionEn:
      "Use this idea when something helps people relax, manage pressure, or protect their mental well-being.",
    popularityScore: 5,
    reuseScore: 5,
    variants: [
      {
        bandLevel: 5.5,
        phrase: "reduce stress",
        exampleSentence: "Listening to music can reduce stress.",
      },
      {
        bandLevel: 6.5,
        phrase: "help people unwind",
        exampleSentence: "Going for a walk can help people unwind after work.",
      },
      {
        bandLevel: 7.5,
        phrase: "ease mental pressure",
        exampleSentence: "Spending time in nature can ease mental pressure and improve mood.",
      },
    ],
    supports: [
      {
        supportType: "REASON",
        text: "Modern life can be overwhelming, so people appreciate activities that give them a mental break.",
        example: "That is one reason entertainment and exercise are so popular.",
      },
      {
        supportType: "RESULT",
        text: "Lower stress usually improves concentration, sleep, and overall mood.",
        example: "As a result, people perform better in other parts of life as well.",
      },
    ],
    patterns: [
      {
        patternText: "I think people like X because it helps them reduce stress.",
        exampleAnswer:
          "I think many people enjoy gardening because it helps them reduce stress and gives them a peaceful break from screens and deadlines.",
      },
    ],
    exampleQuestions: [
      "Why do people need hobbies?",
      "Why do some people enjoy gardening?",
      "What are the benefits of spending time outdoors?",
    ],
  }),
  createIdea({
    title: "Improving health",
    shortLabel: "Health benefits",
    descriptionVi:
      "Y tuong nay dung khi mot lua chon co tac dong tot den suc khoe the chat hoac tinh than cua con nguoi.",
    descriptionEn:
      "Use this idea when a habit, activity, or environment benefits physical or mental health.",
    popularityScore: 5,
    reuseScore: 4,
    variants: [
      {
        bandLevel: 5.5,
        phrase: "be good for health",
        exampleSentence: "Walking every day is good for health.",
      },
      {
        bandLevel: 6.5,
        phrase: "improve overall well-being",
        exampleSentence: "Regular exercise can improve overall well-being.",
      },
      {
        bandLevel: 7.5,
        phrase: "have long-term health benefits",
        exampleSentence: "Cycling to work can have long-term health benefits.",
      },
    ],
    supports: [
      {
        supportType: "REASON",
        text: "Healthy habits help people stay energetic, prevent illness, and maintain a better quality of life.",
        example: "This is why exercise and healthy eating are often encouraged.",
      },
      {
        supportType: "RESULT",
        text: "When people feel healthier, they can work better and enjoy daily life more.",
        example: "So health benefits often influence people's choices strongly.",
      },
    ],
    patterns: [
      {
        patternText: "From my point of view, the biggest advantage of X is its positive impact on health.",
        exampleAnswer:
          "From my point of view, the biggest advantage of cycling is its positive impact on health because it is simple, cheap, and easy to fit into a daily routine.",
      },
    ],
    exampleQuestions: [
      "Why should people exercise?",
      "Why do some people cycle to work?",
      "What are the benefits of outdoor activities?",
    ],
  }),
  createIdea({
    title: "Social connection",
    shortLabel: "Connection",
    descriptionVi:
      "Y tuong nay dung khi mot hoat dong, noi chon hoac cong cu giup con nguoi tao, duy tri hoac lam sau sac hon cac moi quan he xa hoi.",
    descriptionEn:
      "Use this idea when something brings people together, helps them make friends, or strengthens relationships.",
    popularityScore: 5,
    reuseScore: 5,
    variants: [
      {
        bandLevel: 5.5,
        phrase: "meet new people",
        exampleSentence: "Team sports help people meet new people.",
      },
      {
        bandLevel: 6.5,
        phrase: "strengthen social bonds",
        exampleSentence: "Family meals can strengthen social bonds.",
      },
      {
        bandLevel: 7.5,
        phrase: "create a stronger sense of connection",
        exampleSentence:
          "Community events can create a stronger sense of connection among residents.",
      },
    ],
    supports: [
      {
        supportType: "REASON",
        text: "Humans are social, so they naturally value activities that help them connect with others.",
        example: "This is especially true in busy cities where people can feel isolated.",
      },
      {
        supportType: "RESULT",
        text: "Stronger social ties often improve emotional well-being and create support networks.",
        example: "That makes social activities meaningful beyond simple entertainment.",
      },
    ],
    patterns: [
      {
        patternText: "I think X is important because it helps people stay connected.",
        exampleAnswer:
          "I think community centres are important because they help people stay connected and give them a chance to interact face to face.",
      },
    ],
    exampleQuestions: [
      "Why are team sports popular?",
      "Why are community events important?",
      "Why do families like eating together?",
    ],
  }),
  createIdea({
    title: "Independence",
    shortLabel: "Independence",
    descriptionVi:
      "Y tuong nay phu hop khi ban muon noi rang mot trai nghiem hoac ky nang giup con nguoi tu chu hon va it phu thuoc vao nguoi khac.",
    descriptionEn:
      "Use this idea when something helps people rely on themselves more and manage daily life without depending too much on others.",
    popularityScore: 4,
    reuseScore: 4,
    variants: [
      {
        bandLevel: 5.5,
        phrase: "be more independent",
        exampleSentence: "Living alone can make people more independent.",
      },
      {
        bandLevel: 6.5,
        phrase: "learn to rely on themselves",
        exampleSentence: "Part-time jobs help teenagers learn to rely on themselves.",
      },
      {
        bandLevel: 7.5,
        phrase: "develop a stronger sense of independence",
        exampleSentence:
          "Studying abroad can develop a stronger sense of independence in young adults.",
      },
    ],
    supports: [
      {
        supportType: "REASON",
        text: "When people handle tasks by themselves, they gain practical experience and become more resilient.",
        example: "This often happens when they move out or travel alone.",
      },
      {
        supportType: "RESULT",
        text: "Greater independence can improve confidence and decision-making.",
        example: "It also prepares people better for adult life.",
      },
    ],
    patterns: [
      {
        patternText: "One thing I like about X is that it encourages independence.",
        exampleAnswer:
          "One thing I like about part-time jobs for students is that they encourage independence and teach young people how to manage responsibility.",
      },
    ],
    exampleQuestions: [
      "Why should teenagers have part-time jobs?",
      "What are the benefits of living away from parents?",
      "Why do people travel alone?",
    ],
  }),
  createIdea({
    title: "Safety",
    shortLabel: "Safety",
    descriptionVi:
      "Y tuong nay dung khi nguoi ta ua chuong mot lua chon vi no an toan hon, giam rui ro hoac giup ho yen tam hon.",
    descriptionEn:
      "Use this idea when something is preferred because it reduces risk and makes people feel protected or reassured.",
    popularityScore: 4,
    reuseScore: 4,
    variants: [
      {
        bandLevel: 5.5,
        phrase: "be safer",
        exampleSentence: "Many parents think public parks should be safer for children.",
      },
      {
        bandLevel: 6.5,
        phrase: "reduce the risk of accidents",
        exampleSentence: "Bike lanes reduce the risk of accidents in busy streets.",
      },
      {
        bandLevel: 7.5,
        phrase: "provide a greater sense of security",
        exampleSentence:
          "Well-designed public spaces can provide a greater sense of security for residents.",
      },
    ],
    supports: [
      {
        supportType: "REASON",
        text: "People naturally prioritise safety, especially when children, elderly people, or large crowds are involved.",
        example: "That is why rules and infrastructure matter so much.",
      },
      {
        supportType: "RESULT",
        text: "Safer environments allow people to relax and use a service or place with more confidence.",
        example: "This often increases participation as well.",
      },
    ],
    patterns: [
      {
        patternText: "The biggest reason people support X is probably safety.",
        exampleAnswer:
          "The biggest reason people support stricter traffic rules is probably safety, because no one wants to feel at risk when travelling.",
      },
    ],
    exampleQuestions: [
      "Why should cities build more bike lanes?",
      "Why are safety rules important?",
      "What makes a neighbourhood a good place to live?",
    ],
  }),
  createIdea({
    title: "Environmental protection",
    shortLabel: "Environment",
    descriptionVi:
      "Y tuong nay dung khi mot hanh dong hoac lua chon co loi cho moi truong, giam chat thai hoac khuyen khich loi song ben vung hon.",
    descriptionEn:
      "Use this idea when something helps protect the environment, reduce waste, or encourage more sustainable behaviour.",
    popularityScore: 5,
    reuseScore: 5,
    variants: [
      {
        bandLevel: 5.5,
        phrase: "be better for the environment",
        exampleSentence: "Using public transport is better for the environment.",
      },
      {
        bandLevel: 6.5,
        phrase: "reduce environmental damage",
        exampleSentence: "Recycling can reduce environmental damage in the long run.",
      },
      {
        bandLevel: 7.5,
        phrase: "support a more sustainable lifestyle",
        exampleSentence:
          "Using reusable products can support a more sustainable lifestyle.",
      },
    ],
    supports: [
      {
        supportType: "REASON",
        text: "Many daily choices have environmental consequences, so even small changes can matter when many people do them together.",
        example: "This applies to transport, packaging, and energy use.",
      },
      {
        supportType: "RESULT",
        text: "Environmentally friendly habits can reduce pollution and preserve resources for future generations.",
        example: "That makes them both practical and responsible.",
      },
    ],
    patterns: [
      {
        patternText: "Another major benefit of X is that it is better for the environment.",
        exampleAnswer:
          "Another major benefit of cycling is that it is better for the environment because it does not produce emissions and takes up less space on the road.",
      },
    ],
    exampleQuestions: [
      "Why should people use public transport?",
      "Why is recycling important?",
      "Why are reusable products becoming more common?",
    ],
  }),
  createIdea({
    title: "Cultural exposure",
    shortLabel: "Culture",
    descriptionVi:
      "Y tuong nay dung khi mot trai nghiem giup con nguoi tiep xuc voi cac cach song, gia tri hoac tap quan khac nhau.",
    descriptionEn:
      "Use this idea when an experience exposes people to different lifestyles, traditions, or viewpoints.",
    popularityScore: 4,
    reuseScore: 4,
    variants: [
      {
        bandLevel: 5.5,
        phrase: "learn about other cultures",
        exampleSentence: "Travelling helps people learn about other cultures.",
      },
      {
        bandLevel: 6.5,
        phrase: "broaden cultural understanding",
        exampleSentence: "International films can broaden cultural understanding.",
      },
      {
        bandLevel: 7.5,
        phrase: "expose people to different cultural perspectives",
        exampleSentence:
          "Studying abroad can expose people to different cultural perspectives.",
      },
    ],
    supports: [
      {
        supportType: "REASON",
        text: "Meeting different people or seeing different customs can make people more open-minded.",
        example: "This is why travel is often described as educational.",
      },
      {
        supportType: "RESULT",
        text: "Cultural exposure can reduce stereotypes and improve communication across backgrounds.",
        example: "It also makes life more interesting and memorable.",
      },
    ],
    patterns: [
      {
        patternText: "I think X is valuable because it helps people learn about different cultures.",
        exampleAnswer:
          "I think international travel is valuable because it helps people learn about different cultures instead of relying only on second-hand information.",
      },
    ],
    exampleQuestions: [
      "Why do people like travelling abroad?",
      "What are the benefits of watching foreign films?",
      "Why do students study abroad?",
    ],
  }),
  createIdea({
    title: "Creativity",
    shortLabel: "Creativity",
    descriptionVi:
      "Y tuong nay phu hop khi mot hoat dong hay moi truong giup con nguoi nghi ra y tuong moi, bieu lo ban than hoac thu nhieu cach tiep can khac nhau.",
    descriptionEn:
      "Use this idea when something encourages original thinking, self-expression, or experimentation.",
    popularityScore: 4,
    reuseScore: 4,
    variants: [
      {
        bandLevel: 5.5,
        phrase: "be creative",
        exampleSentence: "Art classes help children be creative.",
      },
      {
        bandLevel: 6.5,
        phrase: "encourage creative thinking",
        exampleSentence: "Open-ended projects encourage creative thinking.",
      },
      {
        bandLevel: 7.5,
        phrase: "give people more room for creativity",
        exampleSentence:
          "Flexible workplaces can give people more room for creativity.",
      },
    ],
    supports: [
      {
        supportType: "REASON",
        text: "When people are allowed to explore ideas freely, they often become more engaged and imaginative.",
        example: "This is especially important in education and the arts.",
      },
      {
        supportType: "RESULT",
        text: "Creativity can lead to better solutions, more interesting work, and a stronger sense of personal expression.",
        example: "So it has both practical and emotional value.",
      },
    ],
    patterns: [
      {
        patternText: "What makes X useful is that it encourages people to think creatively.",
        exampleAnswer:
          "What makes project-based learning useful is that it encourages people to think creatively instead of just memorising information.",
      },
    ],
    exampleQuestions: [
      "Why should schools teach art?",
      "What are the benefits of project-based learning?",
      "Why do some jobs require creativity?",
    ],
  }),
  createIdea({
    title: "Productivity",
    shortLabel: "Productivity",
    descriptionVi:
      "Y tuong nay dung khi mot cong cu, khong gian hoac thoi quen giup con nguoi lam viec hieu qua hon va hoan thanh nhieu viec hon.",
    descriptionEn:
      "Use this idea when something helps people work more efficiently and get more done in less time or with less effort.",
    popularityScore: 4,
    reuseScore: 5,
    variants: [
      {
        bandLevel: 5.5,
        phrase: "work better",
        exampleSentence: "A quiet place helps people work better.",
      },
      {
        bandLevel: 6.5,
        phrase: "improve productivity",
        exampleSentence: "Digital calendars can improve productivity at work.",
      },
      {
        bandLevel: 7.5,
        phrase: "help people stay productive",
        exampleSentence:
          "A well-organised workspace can help people stay productive throughout the day.",
      },
    ],
    supports: [
      {
        supportType: "REASON",
        text: "People value tools and habits that reduce distraction and help them manage tasks more clearly.",
        example: "This is why planning apps and quiet workspaces are so popular.",
      },
      {
        supportType: "RESULT",
        text: "Higher productivity can lower stress and free up time for other parts of life.",
        example: "That makes it useful both professionally and personally.",
      },
    ],
    patterns: [
      {
        patternText: "I would say the main advantage of X is that it improves productivity.",
        exampleAnswer:
          "I would say the main advantage of working in a quiet environment is that it improves productivity because people can focus for longer without interruption.",
      },
    ],
    exampleQuestions: [
      "Why do people like working in quiet places?",
      "Why are planning apps useful?",
      "What makes a workplace effective?",
    ],
  }),
  createIdea({
    title: "Emotional support",
    shortLabel: "Support",
    descriptionVi:
      "Y tuong nay phu hop khi ban muon noi rang mot nguoi, noi chon hoac hoat dong giup nguoi ta cam thay duoc chia se, an ui va vung vang hon ve mat tinh than.",
    descriptionEn:
      "Use this idea when something helps people feel understood, comforted, and emotionally supported.",
    popularityScore: 4,
    reuseScore: 4,
    variants: [
      {
        bandLevel: 5.5,
        phrase: "feel supported",
        exampleSentence: "Close friends make people feel supported.",
      },
      {
        bandLevel: 6.5,
        phrase: "provide emotional support",
        exampleSentence: "Family members can provide emotional support in hard times.",
      },
      {
        bandLevel: 7.5,
        phrase: "offer a sense of emotional stability",
        exampleSentence:
          "Strong social networks can offer a sense of emotional stability.",
      },
    ],
    supports: [
      {
        supportType: "REASON",
        text: "People need more than practical help; they also need reassurance and encouragement, especially during stressful periods.",
        example: "That is why relationships matter so much.",
      },
      {
        supportType: "RESULT",
        text: "Emotional support can improve resilience, decision-making, and overall well-being.",
        example: "It helps people feel less alone.",
      },
    ],
    patterns: [
      {
        patternText: "One reason X matters is that it provides emotional support.",
        exampleAnswer:
          "One reason family meals matter is that they provide emotional support and give relatives a chance to talk honestly about their day.",
      },
    ],
    exampleQuestions: [
      "Why is family important?",
      "Why do people need close friends?",
      "Why are support networks valuable?",
    ],
  }),
  createIdea({
    title: "Better opportunities",
    shortLabel: "Opportunities",
    descriptionVi:
      "Y tuong nay dung khi mot lua chon mo ra nhieu co hoi hon cho hoc tap, cong viec hoac trai nghiem song.",
    descriptionEn:
      "Use this idea when something creates better chances for education, career growth, or life experience.",
    popularityScore: 5,
    reuseScore: 5,
    variants: [
      {
        bandLevel: 5.5,
        phrase: "have more opportunities",
        exampleSentence: "Big cities give people more opportunities.",
      },
      {
        bandLevel: 6.5,
        phrase: "open up better opportunities",
        exampleSentence: "Learning English can open up better opportunities.",
      },
      {
        bandLevel: 7.5,
        phrase: "create more room for future opportunities",
        exampleSentence:
          "Higher education can create more room for future opportunities.",
      },
    ],
    supports: [
      {
        supportType: "REASON",
        text: "People often choose places or skills that improve their future prospects.",
        example: "This is common in education, migration, and career decisions.",
      },
      {
        supportType: "RESULT",
        text: "More opportunities usually mean greater financial security and personal choice later on.",
        example: "That long-term value makes the option attractive.",
      },
    ],
    patterns: [
      {
        patternText: "A major reason people choose X is that it gives them better opportunities in the future.",
        exampleAnswer:
          "A major reason people learn English is that it gives them better opportunities in the future, both academically and professionally.",
      },
    ],
    exampleQuestions: [
      "Why is learning English important?",
      "Why do people move to big cities?",
      "Why do students go to university?",
    ],
  }),
  createIdea({
    title: "Learning efficiency",
    shortLabel: "Learn faster",
    descriptionVi:
      "Y tuong nay dung khi mot phuong phap hoac cong cu giup viec hoc tro nen nhanh hon, de nho hon hoac co he thong hon.",
    descriptionEn:
      "Use this idea when a method or tool helps people learn faster, remember better, or study in a more organised way.",
    popularityScore: 4,
    reuseScore: 5,
    variants: [
      {
        bandLevel: 5.5,
        phrase: "learn better",
        exampleSentence: "Videos help some students learn better.",
      },
      {
        bandLevel: 6.5,
        phrase: "make learning more efficient",
        exampleSentence: "Flashcards can make learning more efficient.",
      },
      {
        bandLevel: 7.5,
        phrase: "improve the efficiency of learning",
        exampleSentence:
          "Interactive apps can improve the efficiency of learning for many students.",
      },
    ],
    supports: [
      {
        supportType: "REASON",
        text: "People learn more effectively when information is engaging, organised, and easy to review.",
        example: "That is why visual tools and repetition methods are widely used.",
      },
      {
        supportType: "RESULT",
        text: "Efficient learning saves time and leads to better long-term retention.",
        example: "This is especially valuable for busy students.",
      },
    ],
    patterns: [
      {
        patternText: "I think X is useful because it makes learning more efficient.",
        exampleAnswer:
          "I think learning apps are useful because they make learning more efficient by breaking information into small, manageable steps.",
      },
    ],
    exampleQuestions: [
      "Why do students use learning apps?",
      "What makes a good teacher?",
      "Why are visual materials useful in education?",
    ],
  }),
  createIdea({
    title: "Entertainment and enjoyment",
    shortLabel: "Entertainment",
    descriptionVi:
      "Y tuong nay dung khi mot hoat dong duoc yeu thich vi no vui, thu vi va giup nguoi ta giai tri sau gio hoc hoac lam viec.",
    descriptionEn:
      "Use this idea when something is popular because it is enjoyable, fun, and helps people relax.",
    popularityScore: 5,
    reuseScore: 4,
    variants: [
      {
        bandLevel: 5.5,
        phrase: "be fun",
        exampleSentence: "Board games are fun for families.",
      },
      {
        bandLevel: 6.5,
        phrase: "be a good source of entertainment",
        exampleSentence: "Streaming platforms are a good source of entertainment.",
      },
      {
        bandLevel: 7.5,
        phrase: "offer a simple form of enjoyment",
        exampleSentence:
          "Short videos offer a simple form of enjoyment during a busy day.",
      },
    ],
    supports: [
      {
        supportType: "REASON",
        text: "People do not always want something serious or productive; sometimes they simply want to enjoy themselves.",
        example: "This is why movies, games, and music are so common.",
      },
      {
        supportType: "RESULT",
        text: "Enjoyable activities can lift mood and help people recharge.",
        example: "That makes entertainment a meaningful part of daily life.",
      },
    ],
    patterns: [
      {
        patternText: "I think people enjoy X mainly because it is entertaining and easy to enjoy.",
        exampleAnswer:
          "I think many people like short-form videos mainly because they are entertaining and easy to enjoy even when they only have a few free minutes.",
      },
    ],
    exampleQuestions: [
      "Why do people watch short videos?",
      "Why are board games good for families?",
      "Why is music important to many people?",
    ],
  }),
  createIdea({
    title: "Work-life balance",
    shortLabel: "Balance",
    descriptionVi:
      "Y tuong nay phu hop khi ban muon noi rang mot cach song hay cach lam viec giup con nguoi can bang tot hon giua cong viec va cuoc song ca nhan.",
    descriptionEn:
      "Use this idea when something helps people balance work or study with rest, family, and personal time.",
    popularityScore: 4,
    reuseScore: 4,
    variants: [
      {
        bandLevel: 5.5,
        phrase: "have more balance",
        exampleSentence: "Flexible jobs help people have more balance.",
      },
      {
        bandLevel: 6.5,
        phrase: "maintain a healthier work-life balance",
        exampleSentence: "Remote work can help people maintain a healthier work-life balance.",
      },
      {
        bandLevel: 7.5,
        phrase: "create a better balance between work and personal life",
        exampleSentence:
          "Flexible schedules can create a better balance between work and personal life.",
      },
    ],
    supports: [
      {
        supportType: "REASON",
        text: "If people are always busy, they can become exhausted and less satisfied with life.",
        example: "That is why balance is a major concern for many workers.",
      },
      {
        supportType: "RESULT",
        text: "Better balance often improves mental health, relationships, and even productivity.",
        example: "So it benefits both the individual and the employer.",
      },
    ],
    patterns: [
      {
        patternText: "One clear advantage of X is that it helps people maintain a better work-life balance.",
        exampleAnswer:
          "One clear advantage of working from home is that it helps people maintain a better work-life balance, especially by reducing commuting time.",
      },
    ],
    exampleQuestions: [
      "Why do people want flexible working hours?",
      "Why is remote work popular?",
      "What makes a job attractive?",
    ],
  }),
  createIdea({
    title: "Community belonging",
    shortLabel: "Belonging",
    descriptionVi:
      "Y tuong nay dung khi mot noi chon hoac hoat dong giup con nguoi cam thay minh la mot phan cua tap the va co su gan ket voi nhung nguoi xung quanh.",
    descriptionEn:
      "Use this idea when something helps people feel included, connected to a group, or part of a community.",
    popularityScore: 4,
    reuseScore: 4,
    variants: [
      {
        bandLevel: 5.5,
        phrase: "feel part of a group",
        exampleSentence: "Local events help people feel part of a group.",
      },
      {
        bandLevel: 6.5,
        phrase: "build a sense of belonging",
        exampleSentence: "Clubs can build a sense of belonging for students.",
      },
      {
        bandLevel: 7.5,
        phrase: "strengthen people's connection to their community",
        exampleSentence:
          "Neighbourhood projects can strengthen people's connection to their community.",
      },
    ],
    supports: [
      {
        supportType: "REASON",
        text: "People generally feel happier and safer when they know the people around them and feel accepted.",
        example: "This is important in schools, workplaces, and neighbourhoods.",
      },
      {
        supportType: "RESULT",
        text: "A stronger sense of belonging encourages cooperation and long-term participation.",
        example: "That is why shared events can be surprisingly valuable.",
      },
    ],
    patterns: [
      {
        patternText: "I think X matters because it builds a sense of belonging.",
        exampleAnswer:
          "I think local festivals matter because they build a sense of belonging and remind people that they are part of something bigger than themselves.",
      },
    ],
    exampleQuestions: [
      "Why are local festivals important?",
      "Why do students join clubs?",
      "What makes a neighbourhood friendly?",
    ],
  }),
  createIdea({
    title: "Problem solving",
    shortLabel: "Problem solving",
    descriptionVi:
      "Y tuong nay phu hop khi mot hoat dong hay ky nang giup con nguoi suy nghi logic, tim cach giai quyet van de va dua ra quyet dinh tot hon.",
    descriptionEn:
      "Use this idea when something develops logical thinking, decision-making, or the ability to handle challenges.",
    popularityScore: 4,
    reuseScore: 4,
    variants: [
      {
        bandLevel: 5.5,
        phrase: "solve problems",
        exampleSentence: "Puzzles help children solve problems.",
      },
      {
        bandLevel: 6.5,
        phrase: "develop problem-solving skills",
        exampleSentence: "Group projects develop problem-solving skills.",
      },
      {
        bandLevel: 7.5,
        phrase: "encourage more effective problem-solving",
        exampleSentence:
          "Hands-on learning can encourage more effective problem-solving.",
      },
    ],
    supports: [
      {
        supportType: "REASON",
        text: "People need problem-solving in everyday life, from small personal decisions to bigger academic or work-related tasks.",
        example: "That is why these skills are widely valued.",
      },
      {
        supportType: "RESULT",
        text: "Better problem-solving often leads to more independence and confidence.",
        example: "It also helps people adapt when things do not go as planned.",
      },
    ],
    patterns: [
      {
        patternText: "One thing I appreciate about X is that it helps people develop problem-solving skills.",
        exampleAnswer:
          "One thing I appreciate about strategy games is that they help people develop problem-solving skills in an enjoyable and low-pressure way.",
      },
    ],
    exampleQuestions: [
      "Why are puzzles good for children?",
      "Why should schools use group projects?",
      "What are the benefits of strategy games?",
    ],
  }),
  createIdea({
    title: "Long-term benefits",
    shortLabel: "Long term",
    descriptionVi:
      "Y tuong nay dung khi ban muon giai thich rang gia tri that su cua mot viec nam o tac dong ben vung ve lau dai chu khong chi loi ich truoc mat.",
    descriptionEn:
      "Use this idea when the main value of something comes from lasting benefits rather than immediate results.",
    popularityScore: 4,
    reuseScore: 5,
    variants: [
      {
        bandLevel: 5.5,
        phrase: "be useful in the future",
        exampleSentence: "Learning a foreign language is useful in the future.",
      },
      {
        bandLevel: 6.5,
        phrase: "bring long-term benefits",
        exampleSentence: "Regular exercise can bring long-term benefits.",
      },
      {
        bandLevel: 7.5,
        phrase: "pay off over time",
        exampleSentence:
          "Developing good study habits usually pays off over time.",
      },
    ],
    supports: [
      {
        supportType: "REASON",
        text: "Some choices do not look exciting at first, but they create strong foundations for future success or well-being.",
        example: "This is true for saving, studying, and health habits.",
      },
      {
        supportType: "RESULT",
        text: "Long-term benefits often outweigh short-term inconvenience.",
        example: "That is why disciplined choices can be worthwhile.",
      },
    ],
    patterns: [
      {
        patternText: "Even though X may not give instant results, it brings long-term benefits.",
        exampleAnswer:
          "Even though regular exercise may not give instant results, it brings long-term benefits for both physical health and mental well-being.",
      },
    ],
    exampleQuestions: [
      "Why should people exercise regularly?",
      "Why is learning a language important?",
      "Why do good habits matter?",
    ],
  }),
  createIdea({
    title: "Adaptability",
    shortLabel: "Adaptability",
    descriptionVi:
      "Y tuong nay dung khi mot trai nghiem giup con nguoi linh hoat hon, quen voi thay doi va biet cach xu ly tinh huong moi.",
    descriptionEn:
      "Use this idea when something helps people become more flexible, open to change, and capable of dealing with unfamiliar situations.",
    popularityScore: 4,
    reuseScore: 4,
    variants: [
      {
        bandLevel: 5.5,
        phrase: "adapt to new things",
        exampleSentence: "Travelling helps people adapt to new things.",
      },
      {
        bandLevel: 6.5,
        phrase: "become more adaptable",
        exampleSentence: "Changing schools can make children more adaptable.",
      },
      {
        bandLevel: 7.5,
        phrase: "build the ability to adjust to change",
        exampleSentence:
          "International work experience can build the ability to adjust to change.",
      },
    ],
    supports: [
      {
        supportType: "REASON",
        text: "The modern world changes quickly, so people benefit from learning how to handle uncertainty.",
        example: "This is useful in education, work, and travel.",
      },
      {
        supportType: "RESULT",
        text: "Adaptable people are often less stressed when plans change and more willing to explore new opportunities.",
        example: "So this quality can improve both success and resilience.",
      },
    ],
    patterns: [
      {
        patternText: "I believe X is helpful because it teaches people how to adapt.",
        exampleAnswer:
          "I believe travelling is helpful because it teaches people how to adapt when things do not go exactly as planned.",
      },
    ],
    exampleQuestions: [
      "Why is travelling educational?",
      "What can children learn from changing schools?",
      "Why is adaptability important today?",
    ],
  }),
  createIdea({
    title: "Motivation",
    shortLabel: "Motivation",
    descriptionVi:
      "Y tuong nay phu hop khi mot moi truong, cong cu hoac muc tieu giup con nguoi co dong luc hon de bat dau va duy tri no luc.",
    descriptionEn:
      "Use this idea when something gives people the drive to begin, continue, or improve their efforts.",
    popularityScore: 4,
    reuseScore: 4,
    variants: [
      {
        bandLevel: 5.5,
        phrase: "feel motivated",
        exampleSentence: "Clear goals help students feel motivated.",
      },
      {
        bandLevel: 6.5,
        phrase: "boost motivation",
        exampleSentence: "Positive feedback can boost motivation.",
      },
      {
        bandLevel: 7.5,
        phrase: "keep people motivated over time",
        exampleSentence:
          "Small rewards can keep people motivated over time.",
      },
    ],
    supports: [
      {
        supportType: "REASON",
        text: "People usually work harder when they can see progress or feel that their effort is recognised.",
        example: "This matters in study, sport, and the workplace.",
      },
      {
        supportType: "RESULT",
        text: "Higher motivation often leads to better persistence and better results.",
        example: "It can also improve enjoyment of the process.",
      },
    ],
    patterns: [
      {
        patternText: "What makes X effective is that it keeps people motivated.",
        exampleAnswer:
          "What makes gamified learning effective is that it keeps people motivated by turning progress into something visible and rewarding.",
      },
    ],
    exampleQuestions: [
      "Why do people like rewards?",
      "What motivates students to study?",
      "Why is positive feedback important?",
    ],
  }),
  createIdea({
    title: "Discipline",
    shortLabel: "Discipline",
    descriptionVi:
      "Y tuong nay dung khi mot hoat dong hoac thoi quen giup con nguoi ren tinh ky luat, biet duy tri no luc va theo duoi muc tieu deu dan.",
    descriptionEn:
      "Use this idea when something helps people build self-discipline, consistency, and responsibility.",
    popularityScore: 4,
    reuseScore: 4,
    variants: [
      {
        bandLevel: 5.5,
        phrase: "learn discipline",
        exampleSentence: "Sports help children learn discipline.",
      },
      {
        bandLevel: 6.5,
        phrase: "build self-discipline",
        exampleSentence: "Daily routines can build self-discipline.",
      },
      {
        bandLevel: 7.5,
        phrase: "encourage a more disciplined mindset",
        exampleSentence:
          "Regular training can encourage a more disciplined mindset.",
      },
    ],
    supports: [
      {
        supportType: "REASON",
        text: "Discipline is important because success often depends on doing small things consistently rather than waiting for motivation.",
        example: "That is true in education, sport, and work.",
      },
      {
        supportType: "RESULT",
        text: "A disciplined mindset helps people stay focused and achieve long-term goals.",
        example: "It also makes daily life more organised.",
      },
    ],
    patterns: [
      {
        patternText: "I think X is useful because it teaches discipline and consistency.",
        exampleAnswer:
          "I think learning a musical instrument is useful because it teaches discipline and consistency, since improvement only comes with regular practice.",
      },
    ],
    exampleQuestions: [
      "Why should children play sports?",
      "What can people learn from music lessons?",
      "Why are routines important?",
    ],
  }),
  createIdea({
    title: "Practical skills",
    shortLabel: "Practical skills",
    descriptionVi:
      "Y tuong nay phu hop khi mot trai nghiem giup con nguoi hoc duoc nhung ky nang co the ap dung ngay vao cuoc song that.",
    descriptionEn:
      "Use this idea when something teaches useful real-world skills rather than only theoretical knowledge.",
    popularityScore: 4,
    reuseScore: 5,
    variants: [
      {
        bandLevel: 5.5,
        phrase: "learn useful skills",
        exampleSentence: "Part-time jobs help students learn useful skills.",
      },
      {
        bandLevel: 6.5,
        phrase: "develop practical skills",
        exampleSentence: "Cooking classes can develop practical skills.",
      },
      {
        bandLevel: 7.5,
        phrase: "equip people with real-life skills",
        exampleSentence:
          "Work placements can equip people with real-life skills they cannot get from textbooks alone.",
      },
    ],
    supports: [
      {
        supportType: "REASON",
        text: "People often value activities that prepare them for real situations, such as communication, budgeting, or teamwork.",
        example: "This is why hands-on learning is popular.",
      },
      {
        supportType: "RESULT",
        text: "Practical skills increase independence and can improve employability.",
        example: "They also make people feel more prepared for adulthood.",
      },
    ],
    patterns: [
      {
        patternText: "The main benefit of X is that it helps people develop practical skills.",
        exampleAnswer:
          "The main benefit of part-time work is that it helps young people develop practical skills like time management, teamwork, and communication.",
      },
    ],
    exampleQuestions: [
      "Why should teenagers have part-time jobs?",
      "Why is hands-on learning important?",
      "What should schools teach besides academic subjects?",
    ],
  }),
  createIdea({
    title: "Quality of life",
    shortLabel: "Life quality",
    descriptionVi:
      "Y tuong nay dung khi mot lua chon giup cuoc song noi chung tro nen de chiu, thuan tien, khoe manh hoac hanh phuc hon.",
    descriptionEn:
      "Use this idea when something improves daily comfort, satisfaction, health, or happiness overall.",
    popularityScore: 5,
    reuseScore: 5,
    variants: [
      {
        bandLevel: 5.5,
        phrase: "make life better",
        exampleSentence: "Public parks can make life better for local people.",
      },
      {
        bandLevel: 6.5,
        phrase: "improve people's quality of life",
        exampleSentence: "Good public transport can improve people's quality of life.",
      },
      {
        bandLevel: 7.5,
        phrase: "have a meaningful impact on overall quality of life",
        exampleSentence:
          "Access to green spaces can have a meaningful impact on overall quality of life.",
      },
    ],
    supports: [
      {
        supportType: "REASON",
        text: "People ultimately care about whether something makes everyday life easier, healthier, or more enjoyable.",
        example: "That broad impact makes this idea useful across many topics.",
      },
      {
        supportType: "RESULT",
        text: "If quality of life improves, people usually feel more satisfied with where they live and how they spend their time.",
        example: "This can affect both individuals and communities.",
      },
    ],
    patterns: [
      {
        patternText: "In the long run, X can improve people's quality of life.",
        exampleAnswer:
          "In the long run, reliable public transport can improve people's quality of life by reducing stress, saving time, and making cities more liveable.",
      },
    ],
    exampleQuestions: [
      "Why are parks important in cities?",
      "Why does good public transport matter?",
      "What makes a city a good place to live?",
    ],
  }),
  createIdea({
    title: "Problem prevention",
    shortLabel: "Prevent issues",
    descriptionVi:
      "Y tuong nay dung khi mot hanh dong hoac thoi quen co tac dung ngan tranh rac roi, loi lam hay hau qua xau truoc khi chung xay ra.",
    descriptionEn:
      "Use this idea when something is valuable because it prevents trouble, mistakes, or bigger problems later.",
    popularityScore: 4,
    reuseScore: 4,
    variants: [
      {
        bandLevel: 5.5,
        phrase: "avoid problems",
        exampleSentence: "Planning ahead helps people avoid problems.",
      },
      {
        bandLevel: 6.5,
        phrase: "prevent unnecessary problems",
        exampleSentence: "Regular health checks can prevent unnecessary problems.",
      },
      {
        bandLevel: 7.5,
        phrase: "reduce the likelihood of bigger issues later on",
        exampleSentence:
          "Early planning can reduce the likelihood of bigger issues later on.",
      },
    ],
    supports: [
      {
        supportType: "REASON",
        text: "People often prefer prevention because fixing a problem later usually costs more time, money, and effort.",
        example: "This is true in health, education, and daily organisation.",
      },
      {
        supportType: "RESULT",
        text: "Preventive habits create stability and reduce stress.",
        example: "That makes them highly practical in everyday life.",
      },
    ],
    patterns: [
      {
        patternText: "One practical advantage of X is that it helps people avoid bigger problems later.",
        exampleAnswer:
          "One practical advantage of regular exercise is that it helps people avoid bigger health problems later, which can save both money and stress.",
      },
    ],
    exampleQuestions: [
      "Why are regular health checks important?",
      "Why should people plan ahead?",
      "Why are healthy habits necessary?",
    ],
  }),
  createIdea({
    title: "Access and inclusion",
    shortLabel: "Inclusion",
    descriptionVi:
      "Y tuong nay phu hop khi mot he thong, dia diem hay cong cu giup nhieu nguoi hon co co hoi tham gia va su dung no mot cach cong bang.",
    descriptionEn:
      "Use this idea when something makes participation easier for a wider range of people and supports fairness or inclusion.",
    popularityScore: 4,
    reuseScore: 4,
    variants: [
      {
        bandLevel: 5.5,
        phrase: "help more people join",
        exampleSentence: "Online classes help more people join learning.",
      },
      {
        bandLevel: 6.5,
        phrase: "make access more equal",
        exampleSentence: "Public libraries can make access more equal.",
      },
      {
        bandLevel: 7.5,
        phrase: "create more inclusive access",
        exampleSentence:
          "Digital services can create more inclusive access for people in remote areas.",
      },
    ],
    supports: [
      {
        supportType: "REASON",
        text: "Not everyone has the same resources or opportunities, so better access can make a meaningful difference.",
        example: "This matters a lot in education, technology, and public services.",
      },
      {
        supportType: "RESULT",
        text: "Inclusion helps more people benefit from useful services and reduces social gaps.",
        example: "That is why accessibility should be taken seriously.",
      },
    ],
    patterns: [
      {
        patternText: "A strong point of X is that it makes access more inclusive.",
        exampleAnswer:
          "A strong point of online education is that it makes access more inclusive for people who cannot easily travel to a school or training centre.",
      },
    ],
    exampleQuestions: [
      "Why are online classes useful?",
      "Why are libraries important?",
      "How can technology help people in remote areas?",
    ],
  }),
  createIdea({
    title: "Habit formation",
    shortLabel: "Good habits",
    descriptionVi:
      "Y tuong nay dung khi mot viec co gia tri vi giup con nguoi tao va duy tri nhung thoi quen tot ve lau dai.",
    descriptionEn:
      "Use this idea when something matters because it helps people build and maintain positive long-term habits.",
    popularityScore: 4,
    reuseScore: 4,
    variants: [
      {
        bandLevel: 5.5,
        phrase: "build good habits",
        exampleSentence: "Daily reading helps children build good habits.",
      },
      {
        bandLevel: 6.5,
        phrase: "encourage healthy routines",
        exampleSentence: "Morning exercise can encourage healthy routines.",
      },
      {
        bandLevel: 7.5,
        phrase: "lay the foundation for long-term habits",
        exampleSentence:
          "School routines can lay the foundation for long-term habits.",
      },
    ],
    supports: [
      {
        supportType: "REASON",
        text: "Small daily actions often shape a person's future more than occasional big efforts.",
        example: "That is why routine matters so much.",
      },
      {
        supportType: "RESULT",
        text: "Good habits make positive behaviour easier to repeat and more sustainable.",
        example: "Over time, that can improve health, study, or work outcomes.",
      },
    ],
    patterns: [
      {
        patternText: "I believe X is useful because it helps people build good habits from an early stage.",
        exampleAnswer:
          "I believe reading before bed is useful because it helps children build good habits from an early stage and makes learning feel natural.",
      },
    ],
    exampleQuestions: [
      "Why should children read every day?",
      "Why are routines important for students?",
      "How can people build healthy habits?",
    ],
  }),
  createIdea({
    title: "Sense of achievement",
    shortLabel: "Achievement",
    descriptionVi:
      "Y tuong nay phu hop khi mot hoat dong dem lai cam giac thanh tuu va tu hao, nhat la sau khi no doi hoi no luc hoac kien nhan.",
    descriptionEn:
      "Use this idea when something is rewarding because it gives people a sense of progress, achievement, or pride.",
    popularityScore: 4,
    reuseScore: 4,
    variants: [
      {
        bandLevel: 5.5,
        phrase: "feel proud",
        exampleSentence: "People feel proud when they finish a difficult task.",
      },
      {
        bandLevel: 6.5,
        phrase: "gain a sense of achievement",
        exampleSentence: "Learning a language can give people a sense of achievement.",
      },
      {
        bandLevel: 7.5,
        phrase: "create a strong feeling of accomplishment",
        exampleSentence:
          "Completing a long-term project can create a strong feeling of accomplishment.",
      },
    ],
    supports: [
      {
        supportType: "REASON",
        text: "People enjoy seeing that their effort leads to visible results.",
        example: "That feeling can be very motivating and satisfying.",
      },
      {
        supportType: "RESULT",
        text: "A sense of achievement can boost confidence and encourage people to aim higher next time.",
        example: "It often becomes a positive cycle.",
      },
    ],
    patterns: [
      {
        patternText: "What people often enjoy about X is the sense of achievement it gives them.",
        exampleAnswer:
          "What people often enjoy about learning a musical instrument is the sense of achievement it gives them when they can finally play a song well.",
      },
    ],
    exampleQuestions: [
      "Why do people enjoy learning a skill?",
      "Why are long-term projects meaningful?",
      "What makes a hobby satisfying?",
    ],
  }),
  createIdea({
    title: "Curiosity and exploration",
    shortLabel: "Curiosity",
    descriptionVi:
      "Y tuong nay dung khi mot trai nghiem thu hut con nguoi vi no kich thich su to mo, ham hoc hoi va mong muon kham pha cai moi.",
    descriptionEn:
      "Use this idea when something appeals to people because it satisfies curiosity and encourages exploration.",
    popularityScore: 4,
    reuseScore: 4,
    variants: [
      {
        bandLevel: 5.5,
        phrase: "want to try new things",
        exampleSentence: "Young people often want to try new things.",
      },
      {
        bandLevel: 6.5,
        phrase: "spark curiosity",
        exampleSentence: "Science museums can spark curiosity in children.",
      },
      {
        bandLevel: 7.5,
        phrase: "encourage a spirit of exploration",
        exampleSentence:
          "Travelling can encourage a spirit of exploration and discovery.",
      },
    ],
    supports: [
      {
        supportType: "REASON",
        text: "People are naturally interested in things that feel new, different, or surprising.",
        example: "That is why travel, museums, and documentaries can be so attractive.",
      },
      {
        supportType: "RESULT",
        text: "Curiosity often leads to learning, creativity, and personal growth.",
        example: "So the effect goes beyond simple entertainment.",
      },
    ],
    patterns: [
      {
        patternText: "I think people are drawn to X because it sparks curiosity.",
        exampleAnswer:
          "I think children are drawn to science museums because they spark curiosity and make learning feel like exploration rather than obligation.",
      },
    ],
    exampleQuestions: [
      "Why do children like museums?",
      "Why is travelling exciting?",
      "Why do people watch documentaries?",
    ],
  }),
  createIdea({
    title: "Reliability and consistency",
    shortLabel: "Reliable",
    descriptionVi:
      "Y tuong nay dung khi mot dich vu, he thong hay thoi quen co gia tri vi no on dinh, de tin va co the du doan duoc.",
    descriptionEn:
      "Use this idea when something is preferred because it is dependable, predictable, and consistently performs well.",
    popularityScore: 4,
    reuseScore: 4,
    variants: [
      {
        bandLevel: 5.5,
        phrase: "be reliable",
        exampleSentence: "People like buses when they are reliable.",
      },
      {
        bandLevel: 6.5,
        phrase: "work consistently well",
        exampleSentence: "A good routine works consistently well for busy people.",
      },
      {
        bandLevel: 7.5,
        phrase: "provide a dependable option",
        exampleSentence:
          "Public transport should provide a dependable option for commuters.",
      },
    ],
    supports: [
      {
        supportType: "REASON",
        text: "People often avoid options that are unpredictable because uncertainty creates frustration and wasted time.",
        example: "This matters for transport, technology, and daily routines.",
      },
      {
        supportType: "RESULT",
        text: "Reliable systems make planning easier and reduce stress.",
        example: "That is why consistency is often more important than novelty.",
      },
    ],
    patterns: [
      {
        patternText: "The main reason people value X is that it is reliable.",
        exampleAnswer:
          "The main reason people value public transport is that, when it is reliable, they can plan their day with much more confidence.",
      },
    ],
    exampleQuestions: [
      "What makes public transport good?",
      "Why do people like routines?",
      "Why is reliability important in technology?",
    ],
  }),
  createIdea({
    title: "Shared experiences and memories",
    shortLabel: "Shared memories",
    descriptionVi:
      "Y tuong nay phu hop khi mot hoat dong co y nghia vi no tao ky niem chung va lam gan ket hon giua moi nguoi.",
    descriptionEn:
      "Use this idea when an activity matters because it creates shared memories and strengthens relationships through experience.",
    popularityScore: 4,
    reuseScore: 4,
    variants: [
      {
        bandLevel: 5.5,
        phrase: "make good memories",
        exampleSentence: "Family trips help people make good memories.",
      },
      {
        bandLevel: 6.5,
        phrase: "create shared experiences",
        exampleSentence: "Festivals can create shared experiences for communities.",
      },
      {
        bandLevel: 7.5,
        phrase: "leave lasting memories",
        exampleSentence:
          "Travelling with loved ones often leaves lasting memories.",
      },
    ],
    supports: [
      {
        supportType: "REASON",
        text: "People often value experiences more than things because they become stories and memories that last.",
        example: "This is especially true for family time and celebrations.",
      },
      {
        supportType: "RESULT",
        text: "Shared memories can strengthen relationships and give people a sense of warmth and connection.",
        example: "That emotional value is hard to replace.",
      },
    ],
    patterns: [
      {
        patternText: "I think X is special because it creates shared memories.",
        exampleAnswer:
          "I think family holidays are special because they create shared memories that people can talk about and enjoy for many years afterwards.",
      },
    ],
    exampleQuestions: [
      "Why are family trips important?",
      "Why do people celebrate festivals?",
      "What makes an event memorable?",
    ],
  }),
];
