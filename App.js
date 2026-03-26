import React, { useState, useRef } from 'react';

function App() {
  const [donations, setDonations] = useState([]);
  const [winner, setWinner] = useState(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [message, setMessage] = useState('');

  const [accessToken, setAccessToken] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [showParticipantsModal, setShowParticipantsModal] = useState(false);
  const [participantsModalContent, setParticipantsModalContent] = useState('');

  // --- PAINEL SECRETO ---
  const [logoClickCount, setLogoClickCount] = useState(0);
  const [showSecretPanel, setShowSecretPanel] = useState(false);
  const [secretWinnerName, setSecretWinnerName] = useState('');
  const [forcedWinner, setForcedWinner] = useState(null);
  const logoClickTimer = useRef(null);

  const PROXY_BASE_URL = 'https://livepix-proxy-api.onrender.com/api/livepix';

  // Clique 5x rapidamente na logo para abrir o painel secreto
  const handleLogoClick = () => {
    const newCount = logoClickCount + 1;
    setLogoClickCount(newCount);

    if (logoClickTimer.current) clearTimeout(logoClickTimer.current);

    if (newCount >= 5) {
      setLogoClickCount(0);
      setShowSecretPanel(true);
    } else {
      logoClickTimer.current = setTimeout(() => {
        setLogoClickCount(0);
      }, 2000);
    }
  };

  const handleSetForcedWinner = () => {
    if (secretWinnerName.trim() === '') {
      setForcedWinner(null);
    } else {
      setForcedWinner(secretWinnerName.trim());
    }
    setShowSecretPanel(false);
    setSecretWinnerName('');
  };

  const handleClearForcedWinner = () => {
    setForcedWinner(null);
    setSecretWinnerName('');
    setShowSecretPanel(false);
  };

  const getAccessToken = async () => {
    setIsAuthenticating(true);
    setMessage('Obtendo token de acesso via proxy...');
    try {
      const response = await fetch(`${PROXY_BASE_URL}/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Erro ao obter token: ${response.status} - ${errorData.error || response.statusText}`);
      }

      const data = await response.json();
      setAccessToken(data.access_token);
      setMessage('Token de acesso obtido com sucesso! Agora você pode buscar as doações.');
    } catch (error) {
      console.error('Erro ao obter token de acesso via proxy:', error);
      setMessage(`Erro na autenticação: ${error.message}.`);
      setAccessToken('');
    } finally {
      setIsAuthenticating(false);
    }
  };

  const fetchDonationsFromApi = async () => {
    if (!accessToken) {
      setMessage('Por favor, obtenha um token de acesso primeiro.');
      return;
    }

    setIsAuthenticating(true);
    setMessage('Buscando todos os participantes...');
    setDonations([]);
    try {
      const queryParams = new URLSearchParams();
      if (startDate) queryParams.append('startDate', startDate);
      if (endDate) queryParams.append('endDate', endDate);

      const url = `${PROXY_BASE_URL}/messages?${queryParams.toString()}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Erro HTTP: ${response.status} - ${errorData.message || response.statusText}`);
      }

      const result = await response.json();

      const newDonationsFromApi = result.data.map(d => ({
        id: d.id,
        name: d.username || 'Doador Anônimo',
        amount: d.amount / 100,
        message: d.message || 'Sem mensagem',
        timestamp: new Date(d.createdAt).toLocaleTimeString(),
        createdAt: d.createdAt,
      }));

      const uniqueNewDonations = Array.from(
        new Map(newDonationsFromApi.map(item => [item['id'], item])).values()
      );

      setDonations(uniqueNewDonations);
      setParticipantsModalContent(`Total de participantes: ${uniqueNewDonations.length}`);
      setShowParticipantsModal(true);
      setMessage('');
    } catch (error) {
      console.error('Erro ao buscar doações da API via proxy:', error);
      setMessage(`Erro ao buscar doações: ${error.message}.`);
    } finally {
      setIsAuthenticating(false);
    }
  };

  const drawWinner = () => {
    if (donations.length === 0) {
      setMessage('Não há doações para sortear!');
      setWinner(null);
      return;
    }

    setIsDrawing(true);
    setWinner(null);
    setMessage('Sorteando...');

    let selectedWinner = null;

    if (forcedWinner) {
      // Busca na lista pelo nome (case-insensitive)
      const found = donations.find(
        d => d.name.toLowerCase() === forcedWinner.toLowerCase()
      );
      // Se achar na lista usa os dados reais, senão cria objeto com o nome
      selectedWinner = found || { name: forcedWinner, amount: 0, message: '' };
    } else {
      const drawTickets = [];
      donations.forEach(donation => {
        const numTickets = Math.floor(donation.amount / 10);
        for (let i = 0; i < numTickets; i++) {
          drawTickets.push(donation);
        }
      });

      if (drawTickets.length === 0) {
        setMessage('Nenhum doador tem números da sorte suficientes (doação mínima de R$10)!');
        setIsDrawing(false);
        return;
      }

      const randomIndex = Math.floor(Math.random() * drawTickets.length);
      selectedWinner = drawTickets[randomIndex];
    }

    // Animação de contagem regressiva (igual ao original)
    let countdown = 3;
    const interval = setInterval(() => {
      setMessage(`Sorteando... ${countdown}...`);
      countdown--;
      if (countdown < 0) {
        clearInterval(interval);
        setWinner(selectedWinner);
        setMessage(`Parabéns, ${selectedWinner.name}! Você é o(a) vencedor(a)!`);
        setIsDrawing(false);
        setForcedWinner(null); // Reseta após usar
      }
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 to-indigo-800 text-white font-sans flex flex-col items-center justify-center p-4">
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />

      <header className="text-center mb-8">
        {/* Clique 5x rapidamente na logo para abrir o painel secreto */}
        <img
          src="https://i.ibb.co/yn5hs08B/Gemini-Generated-Image-3p0r4j3p0r4j3p0r.png"
          alt="Logo Sorteio LivePix"
          className="mx-auto mb-4 cursor-pointer select-none"
          onClick={handleLogoClick}
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = 'https://placehold.co/300x80/6A0DAD/FFFFFF?text=LIVEPIX+SORTEIO';
          }}
        />
        <p className="text-xl text-purple-200">Cada R$10 doados = 1 número da sorte!</p>
        {/* Indicador discreto apenas visível para quem sabe */}
        {forcedWinner && (
          <p className="text-xs text-purple-500 mt-1 opacity-40 select-none">★</p>
        )}
      </header>

      <main className="bg-white bg-opacity-10 backdrop-blur-sm rounded-3xl shadow-2xl p-8 w-full max-w-4xl flex flex-col md:flex-row gap-8">
        {/* Seção de Doações */}
        <section className="flex-1 bg-white bg-opacity-5 rounded-2xl p-6 shadow-inner">
          <div className="mb-4">
            <button
              onClick={getAccessToken}
              disabled={isAuthenticating || !!accessToken}
              className="mt-2 w-full bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2 px-4 rounded-xl shadow-md transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-yellow-300"
            >
              {isAuthenticating ? 'Obtendo Token...' : (accessToken ? 'Token Obtido!' : 'Obter Token de Acesso')}
            </button>
          </div>

          <div className="mb-4 p-4 bg-white bg-opacity-5 rounded-xl">
            <h3 className="text-xl font-bold mb-3 text-purple-200">Filtrar por Período</h3>
            <div className="flex flex-col sm:flex-row gap-4 mb-4">
              <div className="flex-1">
                <label htmlFor="start-date" className="block text-purple-200 text-sm font-bold mb-2">
                  Data de Início:
                </label>
                <input
                  type="date"
                  id="start-date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="shadow appearance-none border rounded-xl w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline bg-white bg-opacity-80"
                />
              </div>
              <div className="flex-1">
                <label htmlFor="end-date" className="block text-purple-200 text-sm font-bold mb-2">
                  Data Final:
                </label>
                <input
                  type="date"
                  id="end-date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="shadow appearance-none border rounded-xl w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline bg-white bg-opacity-80"
                />
              </div>
            </div>
          </div>

          <div className="mb-4">
            <button
              onClick={fetchDonationsFromApi}
              disabled={isAuthenticating || !accessToken}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-xl shadow-lg transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-blue-300"
            >
              {isAuthenticating ? 'Buscando Participantes...' : 'Buscar Participantes'}
            </button>
          </div>

          <div className="max-h-80 overflow-y-auto pr-2 custom-scrollbar">
            {donations.length === 0 ? (
              <p className="text-purple-300 italic">Nenhuma doação ainda. Obtenha o token e busque da API.</p>
            ) : (
              <ul className="space-y-3">
                {donations.map((donation) => (
                  <li key={donation.id} className="bg-purple-700 bg-opacity-70 rounded-xl p-4 flex flex-col shadow-md">
                    <div>
                      <span className="font-semibold text-lg">{donation.name}</span>
                      <span className="text-xl font-bold text-green-300"> R$ {donation.amount.toFixed(2)}</span>
                    </div>
                    <p className="text-sm text-purple-200 italic">"{donation.message}"</p>
                    <span className="text-xs text-purple-300 self-end mt-1">Às {donation.timestamp}</span>
                    {Math.floor(donation.amount / 10) > 0 && (
                      <span className="text-sm text-yellow-300 font-bold mt-2">
                        +{Math.floor(donation.amount / 10)} número(s) da sorte!
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* Seção de Sorteio */}
        <section className="flex-1 bg-white bg-opacity-5 rounded-2xl p-6 shadow-inner flex flex-col justify-between">
          <div>
            <h2 className="text-3xl font-bold mb-4 text-purple-200">Realizar Sorteio</h2>
            <p className="text-purple-300 mb-6">
              Clique no botão abaixo para sortear um GANHADOR.
            </p>

            <button
              onClick={drawWinner}
              disabled={isDrawing || donations.length === 0}
              className={`w-full font-bold py-4 px-8 rounded-xl shadow-lg transition duration-300 ease-in-out transform ${
                isDrawing || donations.length === 0
                  ? 'bg-gray-500 cursor-not-allowed'
                  : 'bg-green-500 hover:bg-green-600 hover:scale-105 focus:outline-none focus:ring-4 focus:ring-green-300'
              }`}
            >
              {isDrawing ? 'Sorteando...' : 'Sortear Vencedor!'}
            </button>
          </div>

          <div className="mt-8 text-center">
            {message && (
              <p className={`text-xl font-semibold mb-4 ${winner ? 'text-green-300' : 'text-yellow-300'}`}>
                {message}
              </p>
            )}
            {winner && (
              <div className="bg-white bg-opacity-20 rounded-2xl p-6 shadow-xl animate-fade-in">
                <h3 className="text-4xl font-extrabold text-white mb-2">🎉 Vencedor(a)! 🎉</h3>
                <p className="text-5xl font-black text-yellow-300 drop-shadow-lg">{winner.name}</p>
                {winner.amount > 0 && (
                  <p className="text-xl text-purple-200 mt-2">Com uma doação de R$ {winner.amount.toFixed(2)}</p>
                )}
                {winner.message && (
                  <p className="text-lg text-purple-100 italic mt-2">"{winner.message}"</p>
                )}
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Modal de participantes */}
      {showParticipantsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white bg-opacity-90 rounded-3xl p-8 shadow-2xl text-center text-purple-900 max-w-sm w-full">
            <h3 className="text-3xl font-extrabold mb-4">{participantsModalContent}</h3>
            <button
              onClick={() => setShowParticipantsModal(false)}
              className="mt-6 bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded-xl shadow-lg transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-purple-300"
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      {/* ===== PAINEL SECRETO ===== */}
      {showSecretPanel && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-purple-500 rounded-3xl p-8 shadow-2xl text-center max-w-sm w-full">
            <h3 className="text-2xl font-extrabold text-purple-300 mb-2">🔒 Painel Secreto</h3>
            <p className="text-gray-400 text-sm mb-6">
              Digite o nome exato do ganhador.<br />
              Deixe em branco para sortear normalmente.
            </p>

            {forcedWinner && (
              <p className="text-yellow-400 text-sm mb-3">
                Definido atualmente: <strong>{forcedWinner}</strong>
              </p>
            )}

            <input
              type="text"
              value={secretWinnerName}
              onChange={(e) => setSecretWinnerName(e.target.value)}
              placeholder="Nome do ganhador..."
              className="w-full py-3 px-4 rounded-xl text-gray-900 text-center font-bold text-lg mb-4 focus:outline-none focus:ring-4 focus:ring-purple-400"
              onKeyDown={(e) => { if (e.key === 'Enter') handleSetForcedWinner(); }}
              autoFocus
            />

            <div className="flex flex-col gap-3">
              <button
                onClick={handleSetForcedWinner}
                className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded-xl shadow-lg transition duration-200"
              >
                ✅ Confirmar Ganhador
              </button>
              <button
                onClick={handleClearForcedWinner}
                className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 px-6 rounded-xl shadow-lg transition duration-200"
              >
                🎲 Limpar e Sortear Aleatório
              </button>
              <button
                onClick={() => setShowSecretPanel(false)}
                className="text-gray-500 hover:text-gray-300 text-sm py-2 transition duration-200"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(255,255,255,0.1); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background-color: rgba(192,132,252,0.7); border-radius: 10px; border: 2px solid rgba(255,255,255,0.1); }
        @keyframes fade-in { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fade-in 0.5s ease-out forwards; }
      `}</style>
    </div>
  );
}

export default App;
