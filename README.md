# WhoPays - On-Chain Social Payments on Celo

A decentralized application (dApp) that makes splitting bills fun and fair. When you're out with friends, let the blockchain decide who pays!

## 🎯 What is WhoPays?

WhoPays is a social payment platform built on the Celo blockchain. Instead of arguing about who pays the bill, add your friends' names, spin the wheel, and let the smart contract randomly select the "unlucky" payer. The selected person pays the full amount on-chain, and the funds are securely transferred to the merchant.

## ✨ Features

- **🎡 Interactive Spinner**: Smooth, animated wheel that randomly selects a payer using verifiable on-chain logic.
- **👥 Multiplayer Lobbies**: Create a room, share a QR code, and let everyone join on their own device in real-time.
- **💬 Real-time Chat**: Trash talk and send reactions while waiting for the spin.
- **🔐 Trustless**: On-chain selection ensures fair results every time.
- **📱 Mobile-First**: Optimized for Celo MiniPay and mobile wallets with deep links.
- **🏆 NFT Rewards**: Earn "WhoPays Badges" as soulbound NFTs for being the squad's savior.
- **📊 Analytics**: Global leaderboard and personal payout history.

## 🏗️ Architecture

- **Frontend**: Next.js 15 with TypeScript, Tailwind CSS, Framer Motion.
- **Real-time**: Supabase Broadcast & Presence for instant sync.
- **Blockchain**: Solidity smart contracts on Celo.
- **NFTs**: ERC721 "WhoPays Badge" collectibles.
- **Wallet Integration**: Wagmi + RainbowKit.
- **Mobile Payments**: MiniPay deep links.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- A Celo-compatible wallet (MiniPay, Valora, etc.)
- Supabase Project (for real-time features)

### Installation

1. **Clone and Install**

   ```bash
   git clone <repository-url>
   cd payeer
   cd web && npm install
   cd ../contracts && npm install
   ```

2. **Environment Setup**
   Create `web/.env.local`:

   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key
   ```

3. **Run Development**
   ```bash
   cd web
   npm run dev
   ```

### Using the App

1. **Host**: Enter the bill amount and merchant address, then click "Create Lobby".
2. **Friends**: Scan the QR code or click the share link to join.
3. **Names**: Everyone enters their display name.
4. **Spin**: The host triggers the spin.
5. **Pay**: The chosen player pays on-chain and receives a Badge NFT!

## 🛠️ Project Structure

```
payeer/
├── web/                    # Next.js frontend
├── contracts/             # Hardhat smart contracts
└── README.md
```

### Available Scripts

#### Frontend (`web/` directory)

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

#### Contracts (`contracts/` directory)

- `npx hardhat compile` - Compile contracts
- `npx hardhat test` - Run tests
- `npx hardhat deploy` - Deploy to network

### Environment Variables

Create a `.env.local` file in the `contracts/` directory:

```env
PRIVATE_KEY=your_private_key_here
```

## 🔧 Configuration

### Networks

The app supports both Celo mainnet and Alfajores testnet. Configure networks in `contracts/hardhat.config.js`.

### Wallet Setup

RainbowKit is pre-configured for Celo. Update the project ID in `web/src/components/Providers.tsx` for production use.

## 🧪 Testing

### Contract Tests

```bash
cd contracts
npx hardhat test
```

### Frontend Tests

```bash
cd web
npm run test
```

## 🚢 Deployment

### Smart Contracts

1. **Test on Alfajores**

   ```bash
   npx hardhat run scripts/deploy.js --network alfajores
   ```

2. **Deploy to Mainnet**
   ```bash
   npx hardhat run scripts/deploy.js --network celo
   ```

### Frontend

1. **Build the app**

   ```bash
   cd web
   npm run build
   ```

2. **Deploy to Vercel/Netlify**
   - Connect your repository
   - Set build command: `npm run build`
   - Set output directory: `.next`

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built on [Celo](https://celo.org/) - Carbon-negative blockchain
- UI components powered by [Tailwind CSS](https://tailwindcss.com/)
- Animations by [Framer Motion](https://www.framer.com/motion/)
- Wallet integration via [RainbowKit](https://www.rainbowkit.com/)

## 📞 Support

For questions or support:

- Open an issue on GitHub
- Join the Celo Discord community
- Check the [Celo Developer Documentation](https://docs.celo.org/)

---

**Who pays? The spinner decides!** 🎡💰
