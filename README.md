
# Fantasy Football Keeper Value Calculator 🏈

A comprehensive web application to analyze the value of your fantasy football keeper picks by comparing them against ESPN's Average Draft Position (ADP) data.

## 🌟 Features

- **Player Search**: Search through 505+ NFL players for the 2025 season
- **League Flexibility**: Support for 8, 10, 12, 14, and 16 team leagues
- **ESPN ADP Integration**: Uses current ESPN Average Draft Position data
- **Sophisticated Algorithm**: Advanced scoring system that considers:
  - Elite player premiums for early round talent
  - Position-based adjustments
  - League size calculations
  - Round differential analysis
- **Visual Analysis**: Side-by-side comparison of ESPN ADP vs your keeper slot
- **GIF Reactions**: Dynamic GIF responses based on keeper value tiers
- **Real-time Scoring**: Instant keeper value calculation with detailed breakdown

## 🎯 How It Works

The app calculates keeper value by analyzing the difference between a player's ESPN ADP and your keeper round:

- **LEAGUE WINNER** (60+ points): Elite players kept 4+ rounds later than ADP
- **ELITE** (36+ points): Premium value with significant round advantages  
- **EXCELLENT** (24+ points): Strong keeper choices with good value
- **GOOD** (12+ points): Solid picks that make strategic sense
- **FAIR** (0+ points): Market value keepers
- **POOR** (-18+ points): Below market value
- **TERRIBLE** (<-18 points): Wasted keeper slots

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/fantasy-keeper-calculator.git
cd fantasy-keeper-calculator
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser to `http://localhost:5173`

## 📊 Data Sources

- **Player Database**: 505 NFL players from DynastyProcess
- **ADP Data**: Current 2025 ESPN expert consensus rankings
- **GIF Integration**: Giphy API for keeper value reactions

## 🛠️ Built With

- **Frontend**: React 18 with Vite
- **UI Framework**: Material-UI v7
- **Data**: JSON-based player and ADP databases
- **APIs**: Giphy API for dynamic content

## 📱 Usage

1. **Select a Player**: Use the autocomplete search to find any NFL player
2. **Choose League Size**: Select your league size (8-16 teams)
3. **Set Draft Position**: Pick your draft position within your league
4. **Enter Keeper Round**: Specify which round you're using your keeper slot
5. **Analyze**: Get instant value analysis with detailed breakdown

## 🤖 Algorithm Details

The keeper value algorithm considers:
- **Round Differential**: Primary factor comparing ADP round vs keeper round
- **Elite Player Bonuses**: 1st-3rd round ADP players get massive multipliers
- **Position Adjustments**: RB/WR premiums, QB depth considerations
- **League Size Scaling**: Proper pick calculations for different league sizes
- **Late Round Penalties**: Reduced value for keeping K/DST positions

## 🎮 Example Scenarios

- **Chase Brown (ADP: Round 3, Keeper: Round 7)** = EXCELLENT VALUE
- **Christian McCaffrey (ADP: Round 1, Keeper: Round 9)** = LEAGUE WINNER
- **Random Kicker (ADP: Round 15, Keeper: Round 3)** = TERRIBLE

## 🤝 Contributing

Feel free to submit issues, feature requests, or pull requests to improve the calculator!

## 📄 License

This project is open source and available under the MIT License.

## 🔗 Connect

Share your best keeper finds and let your league mates know when you're about to dominate! 

---

*Built for fantasy football enthusiasts who want to gain a competitive edge through data-driven keeper decisions.*
