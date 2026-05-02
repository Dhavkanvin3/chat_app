import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.arhamfintech.chatapp',
  appName: 'ChatApp',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
