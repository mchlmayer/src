import React, { useState, useEffect, useCallback } from 'react'; 

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

  // NOVO: Estado para controlar qual tela mostrar (main ou admin)
  const [currentView, setCurrentView] = useState('main');
  // NOVO: Estado visual para o painel admin saber quem está "escolhido"
  const [riggedWinnerName, setRiggedWinnerName] = useState('');

  const PROXY_BASE_URL = 'https://livepix-proxy-api.onrender.com/api/livepix'; 

  // Verifica a URL ao carregar e quando o hash mudar para alternar as telas
  useEffect(() => {
    const handleHashChange = () => {
      if (window.location.hash === '#admin') {
        setCurrentView('admin');
        // Carrega o nome do vencedor forçado, se houver, para mostrar no painel
        const savedRigged = localStorage.getItem('riggedWinner');
        if (savedRigged) {
          setRiggedWinnerName(JSON.parse(savedRigged).name);
        }
      } else {
        setCurrentView('main');
      }
    };

    // Executa na montagem
    handleHashChange();

    // Escuta mudanças
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const simulateNewDonations = useCallback(() => {
    const newDonors = [
      { name: 'Alice', amount: 10.00, message: 'Boa sorte a todos!', createdAt: '2025-05-20T10:00:00Z' },
      { name: 'Bob', amount: 25.50, message: 'Mandando uma força!', createdAt: '2025-05-22T11:30:00Z' },
      { name: 'Charlie', amount: 5.00, message: 'Pequena ajuda!', createdAt: '2025-05-25T12:00:00Z' },
      { name: 'Diana', amount: 50.00, message: 'Pra ajudar na live!', createdAt: '2025-05-28T13:45:00Z' },
      { name: 'Eduardo', amount: 15.00, message: 'Tamo junto!', createdAt: '2025-06-01T14:00:00Z' },
    ];

    const numNew = Math.floor(Math.random() * 3) + 1;
    const addedDonations = [];
    for (let i = 0; i < numNew; i++) {
      const randomDonor = newDonors[Math.floor(Math.random() * newDonors.length)];
      addedDonations.push({
        id: Date.now() + Math.random(),
        name: randomDonor.name,
        amount: randomDonor.amount,
        message: randomDonor.message,
        timestamp: new Date().toLocaleTimeString(),
      });
    }

    setDonations(prevDonations => [...prevDonations, ...addedDonations]);
    setMessage(`Simuladas ${addedDonations.length} novas doações!`);
  }, []);

  useEffect(() => {
    simulateNewDonations();
  }, [simulateNewDonations]);

  const getAccessToken = async () => {
    setIsAuthenticating(true);
    setMessage('Obtendo token de acesso via proxy...');
    try {
      const response = await fetch(`${PROXY_BASE_URL}/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}), 
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Erro ao obter token: ${response.status} - ${errorData.error || response.statusText}`);
      }

      const data = await response.json();
      setAccessToken(data.access_token);
      setMessage('Token de acesso obtido com sucesso! Agora você pode buscar os participantes.');
    } catch (error) {
      console.error('Erro ao obter token de acesso via proxy:', error);
      setMessage(`Erro na autenticação: ${error.message}. Verifique as variáveis de ambiente do proxy.`);
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
        createdAt: d.createdAt
      }));

      const uniqueNewDonations = Array.from(new Map(newDonationsFromApi.map(item => [item['id'], item])).values());

      setDonations(uniqueNewDonations); 
      setParticipantsModalContent(`Total de participantes: ${uniqueNewDonations.length}`);
      setShowParticipantsModal(true);
      setMessage(''); 
    } catch (error) {
      console.error('Erro ao buscar doações da API via proxy:', error);
      setMessage(`Erro ao buscar doações: ${error.message}. Verifique o token e se o proxy está rodando.`);
    } finally {
      setIsAuthenticating(false);
    }
  };

  // NOVO: Função para definir o ganhador oculto
  const setRiggedWinner = (participant) => {
    localStorage.setItem('riggedWinner', JSON.stringify(participant));
    setRiggedWinnerName(participant.name);
    alert(`O ganhador foi definido secretamente para: ${participant.name}`);
  };

  // NOVO: Função para limpar o ganhador oculto
  const clearRiggedWinner = () => {
    localStorage.removeItem('riggedWinner');
    setRiggedWinnerName('');
    alert('O ganhador secreto foi removido. O próximo sorteio será 100% aleatório.');
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

    let countdown = 3;
    const interval = setInterval(() => {
      setMessage(`Sorteando... ${countdown}...`);
      countdown--;
      if (countdown < 0) {
        clearInterval(interval);

        // MODIFICADO: Verifica se existe um ganhador forçado no localStorage
        const riggedWinnerJson = localStorage.getItem('riggedWinner');
        let selectedWinner;

        if (riggedWinnerJson) {
          // Usa o ganhador forçado
          selectedWinner = JSON.parse(riggedWinnerJson);
          // Opcional: Remover após o sorteio para que não ganhe sempre acidentalmente
          // localStorage.removeItem('riggedWinner'); 
        } else {
          // Sorteio normal e aleatório
          const randomIndex = Math.floor(Math.random() * drawTickets.length);
          selectedWinner = drawTickets[randomIndex];
        }
        
        setWinner(selectedWinner);
        setMessage(`Parabéns, ${selectedWinner.name}! Você é o(a) vencedor(a)!`);
        setIsDrawing(false);
      }
    }, 1000);
  };

  // ==========================================
  // RENDERIZAÇÃO DO PAINEL ADMIN (OCULTO)
  // ==========================================
  if (currentView === 'admin') {
    return (
      <div className="min-h-screen bg-gray-900 text-white font-sans p-8">
        <div className="max-w-4xl mx-auto">
          <header className="flex justify-between items-center mb-8 border-b border-gray-700 pb-4">
            <h1 className="text-3xl font-bold text-red-500">Painel Admin Secreto</h1>
            <a href="#/" className="text-blue-400 hover:text-blue-300 underline">Voltar ao Sorteio Normal</a>
          </header>

          <div className="bg-gray-800 p-6 rounded-xl shadow-lg mb-8 border border-gray-700">
            <h2 className="text-xl font-bold mb-4">Controle de Sorteio</h2>
            {riggedWinnerName ? (
              <div className="bg-red-900 bg-opacity-50 border border-red-500 p-4 rounded-lg flex justify-between items-center">
                <p>O próximo sorteio está <strong className="text-red-400">FORÇADO</strong> para: <span className="font-bold text-xl">{riggedWinnerName}</span></p>
                <button onClick={clearRiggedWinner} className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded font-bold">Cancelar Escolha</button>
              </div>
            ) : (
              <div className="bg-green-900 bg-opacity-50 border border-green-500 p-4 rounded-lg">
                <p>O próximo sorteio será <strong className="text-green-400">100% Aleatório</strong>.</p>
              </div>
            )}
          </div>

          <div className="bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-700">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Lista de Participantes</h2>
              <div>
                {!accessToken ? (
                  <button onClick={getAccessToken} disabled={isAuthenticating} className="bg-yellow-600 hover:bg-yellow-500 px-4 py-2 rounded font-bold mr-2">
                    1. Obter Token
                  </button>
                ) : (
                  <button onClick={fetchDonationsFromApi} disabled={isAuthenticating} className="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded font-bold">
                    2. Buscar da API
                  </button>
                )}
              </div>
            </div>

            {message && <p className="text-sm text-gray-400 mb-4">{message}</p>}

            <div className="max-h-96 overflow-y-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="py-2">Nome</th>
                    <th className="py-2">Valor</th>
                    <th className="py-2">Data/Hora</th>
                    <th className="py-2 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {donations.length === 0 ? (
                    <tr><td colSpan="4" className="py-4 text-center text-gray-500">Nenhum participante carregado.</td></tr>
                  ) : (
                    donations.map(d => (
                      <tr key={d.id} className="border-b border-gray-700 hover:bg-gray-700">
                        <td className="py-3 font-semibold">{d.name}</td>
                        <td className="py-3 text-green-400">R$ {d.amount.toFixed(2)}</td>
                        <td className="py-3 text-sm text-gray-400">{d.timestamp}</td>
                        <td className="py-3 text-right">
                          <button 
                            onClick={() => setRiggedWinner(d)}
                            className="bg-red-600 hover:bg-red-500 text-white text-xs font-bold py-1 px-3 rounded"
                          >
                            Forçar Vitória
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // RENDERIZAÇÃO DA PÁGINA NORMAL
  // ==========================================
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 to-indigo-800 text-white font-sans flex flex-col items-center justify-center p-4">
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />

      <header className="text-center mb-8">
        <img
          src="https://placehold.co/300x80/6A0DAD/FFFFFF?text=LIVEPIX+SORTEIO" 
          alt="Logo Sorteio LivePix"
          className="mx-auto mb-4 rounded-lg shadow-lg"
          style={{ maxWidth: '300px', height: 'auto' }} 
          onError={(e) => { e.target.onerror = null; e.target.src = "https://placehold.co/300x80/6A0DAD/FFFFFF?text=LIVEPIX+SORTEIO"; }}
        />
        <p className="text-md text-purple-300 mt-2">Cada R$10 doados = 1 número da sorte!</p>
      </header>

      <main className="bg-white bg-opacity-10 backdrop-blur-sm rounded-3xl shadow-2xl p-8 w-full max-w-4xl flex flex-col md:flex-row gap-8">
        <section className="flex-1 bg-white bg-opacity-5 rounded-2xl p-6 shadow-inner">
          <h2 className="text-3xl font-bold mb-4 text-purple-200">Pessoas Participantes</h2> 

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
            <p className="text-sm text-purple-300 italic">
              O filtro será aplicado nas doações mais recentes que a API do LivePix retornar.
            </p>
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
                      <span className="text-xl font-bold text-green-300">R$ {donation.amount.toFixed(2)}</span>
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
                <p className="text-xl text-purple-200 mt-2">Com uma doação de R$ {winner.amount.toFixed(2)}</p>
                {winner.message && (
                  <p className="text-lg text-purple-100 italic mt-2">"{winner.message}"</p>
                )}
              </div>
            )}
          </div>
        </section>
      </main>

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

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }

        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: rgba(192, 132, 252, 0.7); 
          border-radius: 10px;
          border: 2px solid rgba(255, 255, 255, 0.1);
        }

        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background-color: rgba(192, 132, 252, 1); 
        }

        @keyframes fade-in {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .animate-fade-in {
          animation: fade-in 0.5s ease-out forwards;
        }
      `}</style>
    </div>
  );
}

export default App;
