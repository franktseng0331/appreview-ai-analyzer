export interface Option {
  value: string;
  label: string;
  icon?: string;
}

export const LANGUAGES: Option[] = [
  { value: 'en', label: 'English (英语)', icon: '🇺🇸' },
  { value: 'zh-CN', label: 'Chinese (Simplified) (简体中文)', icon: '🇨🇳' },
  { value: 'zh-TW', label: 'Chinese (Traditional) (繁体中文)', icon: '🇭🇰' },
  { value: 'ja', label: 'Japanese (日语)', icon: '🇯🇵' },
  { value: 'ko', label: 'Korean (韩语)', icon: '🇰🇷' },
  { value: 'es', label: 'Spanish (西班牙语)', icon: '🇪🇸' },
  { value: 'fr', label: 'French (法语)', icon: '🇫🇷' },
  { value: 'de', label: 'German (德语)', icon: '🇩🇪' },
  { value: 'ru', label: 'Russian (俄语)', icon: '🇷🇺' },
  { value: 'pt', label: 'Portuguese (葡萄牙语)', icon: '🇵🇹' },
  { value: 'ar', label: 'Arabic (阿拉伯语)', icon: '🇸🇦' },
  { value: 'hi', label: 'Hindi (印地语)', icon: '🇮🇳' },
  { value: 'id', label: 'Indonesian (印尼语)', icon: '🇮🇩' },
];

export const REGIONS: Option[] = [
  { value: 'us', label: 'United States (美国)', icon: '🇺🇸' },
  { value: 'gb', label: 'United Kingdom (英国)', icon: '🇬🇧' },
  { value: 'ca', label: 'Canada (加拿大)', icon: '🇨🇦' },
  { value: 'de', label: 'Germany (德国)', icon: '🇩🇪' },
  { value: 'fr', label: 'France (法国)', icon: '🇫🇷' },
  { value: 'jp', label: 'Japan (日本)', icon: '🇯🇵' },
  { value: 'kr', label: 'South Korea (韩国)', icon: '🇰🇷' },
  { value: 'tw', label: 'Taiwan (中国台湾)', icon: '🇹🇼' },
  { value: 'hk', label: 'Hong Kong (中国香港)', icon: '🇭🇰' },
  { value: 'sg', label: 'Singapore (新加坡)', icon: '🇸🇬' },
  { value: 'au', label: 'Australia (澳大利亚)', icon: '🇦🇺' },
  { value: 'in', label: 'India (印度)', icon: '🇮🇳' },
  { value: 'id', label: 'Indonesia (印尼)', icon: '🇮🇩' },
  { value: 'br', label: 'Brazil (巴西)', icon: '🇧🇷' },
  { value: 'ae', label: 'United Arab Emirates (阿联酋)', icon: '🇦🇪' },
];
