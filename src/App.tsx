import React, { useState } from 'react';

// Type definitions based on your JSON structure
interface Species {
  name: string;
  imageUrl: string | null;
  id: number;
  form: string | null;
  state: 'AVAILABLE' | 'EXCLUDED';
}

interface GameData {
  id: number;
  species: Species[];
  gameState: 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  hint: string;
  explanation: string;
  expectedExclusions: number;
  validGuess: boolean;
}

interface ExcludeRequest {
  gameId: number;
  speciesId: number;
  form: string | null;
}

const PokemonGuessingGame: React.FC = () => {
  const [gameData, setGameData] = useState<GameData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastClickedSpecies, setLastClickedSpecies] = useState<{id: number, form: string | null} | null>(null);

  // Using proxy - no need for full URL in development
  const API_BASE_URL = ''; // Empty string uses proxy from package.json

  const startNewGame = async () => {
    setLoading(true);
    setError(null);
    setLastClickedSpecies(null); // Reset clicked species on new game

    try {
      const response = await fetch(`${API_BASE_URL}/game/new`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        mode: 'cors', // Explicitly set CORS mode
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: GameData = await response.json();
      setGameData(data);
    } catch (err) {
      if (err instanceof TypeError && err.message.includes('Failed to fetch')) {
        setError('CORS Error: Unable to connect to backend. Please check your backend CORS configuration or use a proxy.');
      } else {
        setError(err instanceof Error ? err.message : 'Failed to start new game');
      }
    } finally {
      setLoading(false);
    }
  };

  const excludeSpecies = async (species: Species) => {
    if (!gameData || species.state !== 'AVAILABLE' || gameData.gameState !== 'IN_PROGRESS') return;

    setLoading(true);
    setError(null);

    // Track which species was clicked for color feedback
    setLastClickedSpecies({ id: species.id, form: species.form });

    const request: ExcludeRequest = {
      gameId: gameData.id,
      speciesId: species.id,
      form: species.form,
    };

    try {
      const response = await fetch(`${API_BASE_URL}/game/exclude`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        mode: 'cors', // Explicitly set CORS mode
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: GameData = await response.json();
      setGameData(data);
    } catch (err) {
      if (err instanceof TypeError && err.message.includes('Failed to fetch')) {
        setError('CORS Error: Unable to connect to backend. Please check your backend CORS configuration.');
      } else {
        setError(err instanceof Error ? err.message : 'Failed to exclude species');
      }
    } finally {
      setLoading(false);
    }
  };

  const getSpeciesBorderColor = (species: Species) => {
    // If this species was the last clicked one, determine color based on game response
    if (gameData && lastClickedSpecies &&
        species.id === lastClickedSpecies.id &&
        species.form === lastClickedSpecies.form) {

      if (gameData.gameState === 'FAILED') {
        return '#e74c3c'; // Red - game lost
      } else if (gameData.validGuess) {
        return '#27ae60'; // Green - correct guess
      } else {
        return '#f39c12'; // Orange - wrong guess but game continues
      }
    }

    // Default border colors based on state
    if (species.state === 'EXCLUDED') {
      return '#95a5a6'; // Gray for excluded
    }

    return '#3498db'; // Blue for available
  };

  const getGameStatusMessage = () => {
    if (!gameData) return null;

    switch (gameData.gameState) {
      case 'COMPLETED':
        return (
            <div className="status-message success">
              <div className="status-icon">🎉</div>
              <div className="status-text">
                <h2>Congratulations!</h2>
                <p>You won the game!</p>
              </div>
            </div>
        );
      case 'FAILED':
        return (
            <div className="status-message failure">
              <div className="status-icon">💥</div>
              <div className="status-text">
                <h2>Game Over!</h2>
                <p>You made an incorrect guess.</p>
              </div>
            </div>
        );
      default:
        return null;
    }
  };

  return (
      <div className="game-container">
        {error && (
            <div className="error-message">
              Error: {error}
            </div>
        )}

        {!gameData && (
            <div className="no-game-state">
              <button
                  className="new-game-btn-large"
                  onClick={startNewGame}
                  disabled={loading}
              >
                {loading ? 'Loading...' : 'Start New Game'}
              </button>
            </div>
        )}

        {gameData && (
            <div className="game-content">
              {getGameStatusMessage()}

              <div className="game-header">
                <div className="hint-section">
                  <h3>Hint:</h3>
                  <p className="hint">{gameData.hint}</p>
                  {gameData.explanation && (
                      <div className="explanation-section">
                        <h3>Explanation:</h3>
                        <p className="explanation">{gameData.explanation}</p>
                      </div>
                  )}
                </div>

                <div className="controls-section">
                  <button
                      className="new-game-btn"
                      onClick={startNewGame}
                      disabled={loading}
                  >
                    {loading ? 'Loading...' : 'New Game'}
                  </button>

                  <div className="exclusions-section">
                    <h3>Expected Exclusions:</h3>
                    <div className="exclusions-count">{gameData.expectedExclusions}</div>
                  </div>
                </div>
              </div>

              <div className="pokemon-grid">
                {gameData.species.map((species, index) => (
                    <div
                        key={`${species.id}-${species.form || 'default'}`}
                        className={`pokemon-card ${species.state.toLowerCase()} ${
                            species.state === 'AVAILABLE' && gameData.gameState === 'IN_PROGRESS' ? 'clickable' : ''
                        }`}
                        style={{
                          borderColor: getSpeciesBorderColor(species),
                          borderWidth: '4px'
                        }}
                        onClick={() => excludeSpecies(species)}
                    >
                      <div className="pokemon-image">
                        {species.imageUrl ? (
                            <img
                                src={species.imageUrl}
                                alt={species.name}
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                }}
                            />
                        ) : (
                            <div className="no-image">No Image</div>
                        )}
                      </div>
                      <div className="pokemon-name">
                        {species.name}
                        {species.form && <span className="form"> ({species.form})</span>}
                      </div>
                    </div>
                ))}
              </div>
            </div>
        )}

        <style>{`
        .game-container {
          max-width: 1000px;
          margin: 0 auto;
          padding: 10px;
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          min-height: 100vh;
          box-sizing: border-box;
        }
        
        .no-game-state {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 50vh;
        }
        
        .new-game-btn-large {
          padding: 15px 30px;
          font-size: 18px;
          font-weight: bold;
          background: linear-gradient(135deg, #3498db, #2980b9);
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.3s ease;
        }
        
        .new-game-btn-large:hover:not(:disabled) {
          background: linear-gradient(135deg, #2980b9, #1f6391);
          transform: translateY(-2px);
          box-shadow: 0 4px 8px rgba(0,0,0,0.2);
        }
        
        .new-game-btn-large:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        
        .new-game-btn {
          padding: 8px 16px;
          font-size: 14px;
          font-weight: bold;
          background: linear-gradient(135deg, #3498db, #2980b9);
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.3s ease;
          margin-bottom: 10px;
        }
        
        .new-game-btn:hover:not(:disabled) {
          background: linear-gradient(135deg, #2980b9, #1f6391);
          transform: translateY(-1px);
          box-shadow: 0 3px 6px rgba(0,0,0,0.2);
        }
        
        .new-game-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        
        .error-message {
          background-color: #e74c3c;
          color: white;
          padding: 8px;
          border-radius: 6px;
          margin-bottom: 10px;
          text-align: center;
          font-weight: bold;
          font-size: 14px;
        }
        
        .status-message {
          padding: 8px;
          border-radius: 6px;
          margin-bottom: 10px;
          text-align: center;
          font-weight: bold;
          font-size: 16px;
        }
        
        .status-message.success {
          background-color: #2ecc71;
          color: white;
        }
        
        .status-message.failure {
          background-color: #e74c3c;
          color: white;
        }
        
        .game-header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 15px;
          gap: 20px;
          align-items: flex-start;
        }
        
        .hint-section {
          flex: 2;
          text-align: left;
        }
        
        .controls-section {
          flex: 0 0 auto;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
        }
        
        .exclusions-section {
          text-align: center;
        }
        
        .hint-section h3, .exclusions-section h3 {
          color: #2c3e50;
          margin-bottom: 6px;
          font-size: 0.9rem;
          margin-top: 0;
        }
        
        .hint {
          background-color: #f8f9fa;
          padding: 8px;
          border-radius: 6px;
          border-left: 3px solid #3498db;
          font-size: 14px;
          font-style: italic;
          line-height: 1.4;
          margin: 0;
        }
        
        .explanation {
          background-color: #fff3cd;
          padding: 8px;
          border-radius: 6px;
          border-left: 3px solid #ffc107;
          font-size: 14px;
          line-height: 1.4;
          margin: 0;
          margin-top: 8px;
        }
        
        .exclusions-count {
          background-color: #e74c3c;
          color: white;
          font-size: 20px;
          font-weight: bold;
          padding: 8px;
          border-radius: 6px;
          min-width: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .pokemon-grid {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 8px;
          margin-top: 15px;
        }
        
        .pokemon-card {
          background: white;
          border: 4px solid #ecf0f1;
          border-radius: 8px;
          padding: 6px;
          text-align: center;
          transition: all 0.3s ease;
          min-height: 120px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }
        
        .pokemon-card.clickable {
          cursor: pointer;
        }
        
        .pokemon-card.clickable:hover {
          transform: translateY(-3px);
          box-shadow: 0 6px 15px rgba(52, 152, 219, 0.3);
        }
        
        .pokemon-card.excluded {
          background-color: #95a5a6;
          opacity: 0.6;
          cursor: not-allowed;
        }
        
        .pokemon-image {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 6px;
        }
        
        .pokemon-image img {
          max-width: 50px;
          max-height: 50px;
          object-fit: contain;
        }
        
        .no-image {
          width: 50px;
          height: 50px;
          background-color: #ecf0f1;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 6px;
          color: #7f8c8d;
          font-size: 10px;
        }
        
        .pokemon-name {
          font-weight: bold;
          color: #2c3e50;
          font-size: 11px;
          word-wrap: break-word;
          line-height: 1.2;
        }
        
        .form {
          font-size: 10px;
          color: #7f8c8d;
          font-weight: normal;
        }
        
        @media (max-width: 1024px) {
          .pokemon-grid {
            grid-template-columns: repeat(5, 1fr);
            gap: 6px;
          }
          
          .pokemon-card {
            min-height: 100px;
            padding: 6px;
          }
          
          .pokemon-image img {
            max-width: 40px;
            max-height: 40px;
          }
          
          .no-image {
            width: 40px;
            height: 40px;
          }
          
          .pokemon-name {
            font-size: 10px;
          }
        }
        
        @media (max-width: 768px) {
          .game-header {
            flex-direction: column;
            gap: 15px;
          }
          
          .controls-section {
            flex-direction: row;
            justify-content: space-between;
            align-items: center;
            width: 100%;
          }
          
          .pokemon-grid {
            grid-template-columns: repeat(3, 1fr);
            gap: 8px;
          }
          
          .exclusions-count {
            font-size: 18px;
            padding: 6px;
            min-width: 35px;
          }
          
          .pokemon-card {
            min-height: 110px;
            padding: 8px;
          }
          
          .pokemon-image img {
            max-width: 45px;
            max-height: 45px;
          }
        }
        
        @media (max-width: 480px) {
          .pokemon-grid {
            grid-template-columns: repeat(2, 1fr);
          }
          
          .pokemon-card {
            min-height: 100px;
            padding: 6px;
          }
          
          .pokemon-image img {
            max-width: 40px;
            max-height: 40px;
          }
          
          .controls-section {
            flex-direction: column;
            gap: 8px;
          }
        }
      `}</style>
      </div>
  );
};

export default PokemonGuessingGame;