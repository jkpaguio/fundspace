import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'app.fundspace.finance',
  appName: 'FundSpace',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
}

export default config
