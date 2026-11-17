import { useState } from 'react'
import { CapacitorHttp } from '@capacitor/core'
import { Home, Tv, Film, Clapperboard, Search, User, Play, Plus, Heart, X } from 'lucide-react'
import './App.css'

const movies = [
  { title: 'Interstellar', genre: 'Ciencia ficción', image: 'https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg' },
  { title: 'The Batman', genre: 'Acción', image: 'https://image.tmdb.org/t/p/w500/74xTEgt7R36Fpooo50r9T25onhq.jpg' },
  { title: 'Dune', genre: 'Aventura', image: 'https://image.tmdb.org/t/p/w500/d5NXSklXo0qyIYkgV94XAgMIckC.jpg' },
  { title: 'Avatar', genre: 'Fantasía', image: 'https://image.tmdb.org/t/p/w500/kyeqWdyUXW608qlYkRqosgbbJyK.jpg' },
]

const movieDetails = {
  'Interstellar': { year: '2014', synopsis: 'Un grupo de exploradores viaja más allá de nuestra galaxia en busca de un nuevo hogar para la humanidad.' },
  'The Batman': { year: '2022', synopsis: 'Batman investiga una serie de crímenes que revelan la corrupción de Gotham City.' },
  'Dune': { year: '2021', synopsis: 'Paul Atreides debe viajar al planeta Arrakis para proteger el futuro de su familia y su pueblo.' },
  'Avatar': { year: '2009', synopsis: 'Un exmarine llega a Pandora y descubre un mundo que cambiará su destino para siempre.' }
}

function App() {
  const [section, setSection] = useState('Inicio')
  const [search, setSearch] = useState('')
  const [selectedMovie, setSelectedMovie] = useState(null)
  const [favorites, setFavorites] = useState([])
  const [connectionType, setConnectionType] = useState('m3u')
  const [playlistUrl, setPlaylistUrl] = useState('')
  const [server, setServer] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [connectionMessage, setConnectionMessage] = useState('')
  const [channels, setChannels] = useState([])
  const [loadingChannels, setLoadingChannels] = useState(false)


  return (
    <div className="app">
      <aside className="sidebar">
        <h1 className="logo">NEX<span>ORA</span></h1>
        <nav>
          {[[Home,'Inicio'],[Tv,'TV en vivo'],[Film,'Películas'],[Clapperboard,'Series']].map(([Icon,name]) => (
            <button className={section === name ? 'active' : ''} onClick={() => setSection(name)} key={name}>
              <Icon size={19}/> {name}
            </button>
          ))}
        </nav>
        <div className="profile"><User size={20}/> Mi perfil</div>
      </aside>

      <main>
        <header>
          <div className="top-search">
            <Search size={18}/>
            <input placeholder="Buscar películas, series..." value={search} onChange={e => setSearch(e.target.value)}/>
          </div>
        </header>

        {section === 'TV en vivo' ? (
          <section className="tv-panel">
            <div className="tv-heading">
              <span>TELEVISIÓN</span>
              <h2>TV en vivo</h2>
              <p>Conecta tu servicio de televisión a NEXORA.</p>
            </div>

            <div className="tv-connection">
              <h3>Configurar conexión</h3>
              <div className="tv-tabs">
                <button className={connectionType === 'm3u' ? 'tv-tab selected' : 'tv-tab'} onClick={() => {setConnectionType('m3u');setConnectionMessage('')}}>Lista M3U</button>
                <button className={connectionType === 'xtream' ? 'tv-tab selected' : 'tv-tab'} onClick={() => {setConnectionType('xtream');setConnectionMessage('')}}>Xtream Codes</button>
              </div>

              {connectionType === 'm3u' ? (
                <div className="tv-fields">
                  <label>URL de tu lista M3U</label>
                  <input value={playlistUrl} onChange={e => setPlaylistUrl(e.target.value)} placeholder="https://servidor.com/lista.m3u" />
                </div>
              ) : (
                <div className="tv-fields">
                  <label>Dirección del servidor</label>
                  <input value={server} onChange={e => setServer(e.target.value)} placeholder="http://servidor:8080" />
                  <label>Usuario</label>
                  <input value={username} onChange={e => setUsername(e.target.value)} placeholder="Tu usuario" />
                  <label>Contraseña</label>
                  <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Tu contraseña" />
                </div>
              )}

              <button className="tv-connect" onClick={async () => {
                if (connectionType !== 'm3u') {
                  setConnectionMessage('La conexión Xtream se implementará en el siguiente paso.')
                  return
                }
                if (!/^https?:\/\//i.test(playlistUrl.trim())) {
                  setConnectionMessage('Ingresa una URL M3U válida.')
                  return
                }
                setLoadingChannels(true)
                setConnectionMessage('Conectando y leyendo la lista...')
                try {
                  const response = await CapacitorHttp.get({
                    url: playlistUrl.trim(),
                    responseType: 'text'
                  })
                  if (response.status < 200 || response.status >= 300) {
                    throw new Error(`HTTP ${response.status}`)
                  }
                  const content = typeof response.data === 'string'
                    ? response.data
                    : String(response.data ?? '')
                  const lines = content.split(/\r?\n/)
                  const loaded = []
                  let info = null

                  for (const raw of lines) {
                    const line = raw.trim()
                    if (!line) continue
                    if (line.startsWith('#EXTINF')) {
                      const attrs = {}
                      for (const match of line.matchAll(/([\w-]+)="([^"]*)"/g)) {
                        attrs[match[1]] = match[2]
                      }
                      const comma = line.indexOf(',')
                      const title = comma >= 0 ? line.slice(comma + 1).trim() : ''
                      info = {
                        name: title || attrs['tvg-name'] || 'Canal sin nombre',
                        logo: attrs['tvg-logo'] || '',
                        category: attrs['group-title'] || 'Otros'
                      }
                    } else if (!line.startsWith('#') && info) {
                      loaded.push({...info, url: line})
                      info = null
                    }
                  }

                  setChannels(loaded)
                  setConnectionMessage(loaded.length
                    ? `¡Lista cargada! ${loaded.length} canales encontrados.`
                    : 'La URL respondió, pero no encontramos canales M3U válidos.')
                } catch (error) {
                  setConnectionMessage(error instanceof TypeError
                    ? 'No se pudo acceder a la lista. Puede estar bloqueada por CORS.'
                    : `Error al cargar la lista: ${error.message}`)
                } finally {
                  setLoadingChannels(false)
                }
              }}> {loadingChannels ? 'Conectando...' : 'Cargar canales →'}</button>

              {connectionMessage && <p className="tv-message">{connectionMessage}</p>}

              {channels.length > 0 && (
                <div className="channel-results">
                  <h3>Canales disponibles ({channels.length})</h3>
                  <div className="channel-grid">
                    {channels.map((channel, index) => (
                      <div className="channel-item" key={`${channel.name}-${index}`}>
                        {channel.logo
                          ? <img src={channel.logo} alt="" onError={e => {e.currentTarget.style.display = 'none'}} />
                          : <Tv size={22} />}
                        <div>
                          <strong>{channel.name}</strong>
                          <small>{channel.category}</small>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>
        ) : (
          <>
        <section className="hero">
          <div className="hero-content">
            <div className="tag">NEXORA ORIGINAL</div>
            <h1>Tu entretenimiento.<br/>Sin límites.</h1>
            <p>Descubre películas, series y televisión en un solo lugar.</p>
            <div className="actions">
              <button className="primary" onClick={() => setSection('Películas')}><Play size={17} fill="currentColor"/> Explorar ahora</button>
              <button className="secondary" onClick={() => setSection('Mi lista')}><Plus size={17}/> Mi lista</button>
            </div>
          </div>
        </section>

        <section className="section">
          <div className="section-heading">
            <h2>{section === 'Inicio' ? 'Tendencias para ti' : section}</h2>
            <span>DESCUBRE MÁS</span>
          </div>
          <div className="movies">
            {movies.filter(movie =>
              `${movie.title} ${movie.genre}`.toLowerCase().includes(search.trim().toLowerCase())
            ).length > 0 ? (
              movies.filter(movie =>
                `${movie.title} ${movie.genre}`.toLowerCase().includes(search.trim().toLowerCase())
              ).map(movie => (
                <article className="movie" key={movie.title}>
                  <div className="poster" style={{backgroundImage:`url(${movie.image})`}}>
                    <button onClick={() => setSelectedMovie(movie)}><Play size={20} fill="currentColor"/></button>
                  </div>
                  <h3>{movie.title}</h3>
                  <p>{movie.genre}</p>
                </article>
              ))
            ) : (
              <p className="empty-results">No encontramos películas o series con "{search}".</p>
            )}
          </div>
        </section>

        {selectedMovie && (
          <div className="movie-modal" onClick={() => setSelectedMovie(null)}>
            <div className="movie-details" onClick={e => e.stopPropagation()}>
              <button className="modal-close" onClick={() => setSelectedMovie(null)}><X size={22}/></button>
              <div className="detail-poster" style={{backgroundImage: `url(${selectedMovie.image})`}} />
              <div className="detail-content">
                <span className="detail-tag">NEXORA ORIGINAL</span>
                <h2>{selectedMovie.title}</h2>
                <p className="detail-meta">{movieDetails[selectedMovie.title]?.year} · {selectedMovie.genre}</p>
                <p className="detail-description">{movieDetails[selectedMovie.title]?.synopsis}</p>
                <div className="detail-actions">
                  <button className="primary" onClick={() => alert('Para reproducir, primero conecta una fuente de contenido compatible.')}>
                    <Play size={18} fill="currentColor"/> Reproducir
                  </button>
                  <button className="favorite-btn" onClick={() => setFavorites(prev => prev.includes(selectedMovie.title) ? prev.filter(x => x !== selectedMovie.title) : [...prev, selectedMovie.title])}>
                    <Heart size={18} fill={favorites.includes(selectedMovie.title) ? 'currentColor' : 'none'}/>
                    {favorites.includes(selectedMovie.title) ? 'En mi lista' : 'Mi lista'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="welcome">
          <Tv size={25}/>
          <div><h3>Tu televisión en un solo lugar</h3><p>Configura tus listas M3U o Xtream para comenzar.</p></div>
          <button onClick={() => setSection('TV en vivo')}>Configurar →</button>
        </div>
        <div className="footer">NEXORA · Tu mundo de entretenimiento</div>
          </>
        )}
      </main>
    </div>
  )
}

export default App
