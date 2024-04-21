function asetaTeatterinValintaKuuntelija() {
    document.getElementById('theater-select').addEventListener('change', (event) => {
        console.log(`Teatterin valinta muuttunut: ${event.target.value}`);
        const theaterId = event.target.value;
        haeElokuvat(theaterId, '');
    });
}

document.addEventListener('DOMContentLoaded', () => {
    haeTeatterit();
    asetaHaku();
    asetaTeatterinValintaKuuntelija();
});

function haeTeatterit() {
    fetch('https://www.finnkino.fi/xml/TheatreAreas/')
        .then(vastaus => vastaus.text())
        .then(str => (new window.DOMParser()).parseFromString(str, "text/xml"))
        .then(data => {
            const teatteriSelect = document.getElementById('theater-select');
            teatteriSelect.innerHTML = '';
            const teatterit = data.getElementsByTagName('TheatreArea');
            Array.from(teatterit).forEach(teatteri => {
                const id = teatteri.getElementsByTagName('ID')[0].textContent;
                const name = teatteri.getElementsByTagName('Name')[0].textContent;
                if (id !== '1029') {
                    const option = new Option(name, id);
                    teatteriSelect.add(option);
                }
            });
        })
        .catch(virhe => console.error('Virhe ladattaessa teattereita:', virhe));
}

function haeElokuvat(theaterId, movieTitle) {
    const url = `https://www.finnkino.fi/xml/Events/?area=${theaterId}`;
    fetch(url)
        .then(response => response.text())
        .then(str => (new window.DOMParser()).parseFromString(str, "text/xml"))
        .then(data => {
            naytaElokuvat(data, theaterId, movieTitle);
        })
        .catch(err => console.error('Virhe haettaessa elokuvia:', err));
}

function asetaHaku() {
    const searchButton = document.getElementById('search-button');
    searchButton.addEventListener('click', suoritaHaku);
}

function suoritaHaku() {
    const selectedTheaterId = document.getElementById('theater-select').value;
    const movieTitle = document.getElementById('movie-search-input').value;
    haeElokuvat(selectedTheaterId, movieTitle);
}

function naytaElokuvat(data, theaterId, movieTitle) {
    const moviesContainer = document.getElementById('movies-container');
    moviesContainer.innerHTML = '';
    const events = data.getElementsByTagName('Event');
    
    Array.from(events).forEach(event => {
        const title = event.getElementsByTagName('Title')[0].textContent;
        if (!movieTitle || title.toLowerCase().includes(movieTitle.toLowerCase())) {
            const elokuvaId = event.getElementsByTagName('ID')[0].textContent;
            const image = event.getElementsByTagName('EventSmallImagePortrait')[0]?.textContent || 'fallback-image-url.jpg';
            const synopsis = event.getElementsByTagName('ShortSynopsis')[0]?.textContent || 'Ei synopsis-tietoa.';
            const genres = event.getElementsByTagName('Genres')[0]?.textContent || 'Ei genre-tietoa.';
            const lengthInMinutes = event.getElementsByTagName('LengthInMinutes')[0]?.textContent || 'Ei kestotietoa.';
            
            const movieElement = document.createElement('div');
            movieElement.classList.add('movie');
            movieElement.innerHTML = `
            <h3>${title}</h3>
            <img src="${image}" alt="${title}" />
            <p>${synopsis}</p>
            <p><strong>Genre:</strong> ${genres}</p>
            <p><strong>Elokuvan kesto:</strong> ${lengthInMinutes} minuuttia</p>
            <div class="showtimes"></div>
        `;
            moviesContainer.appendChild(movieElement);

            haeJaNaytaNaytosajat(elokuvaId, theaterId, movieElement);
        }
    });
}

function haeJaNaytaNaytosajat(elokuvaId, theaterId, movieElement) {
    const currentDate = new Date();
    const formattedDate = `${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}-${currentDate.getDate().toString().padStart(2, '0')}`;
    const url = `https://www.finnkino.fi/xml/Schedule/?eventID=${elokuvaId}&area=${theaterId}&dt=${formattedDate}`;
    
    fetch(url)
        .then(response => response.text())
        .then(str => (new window.DOMParser()).parseFromString(str, "text/xml"))
        .then(data => {
            const shows = data.getElementsByTagName('Show');
            const showtimesContainer = movieElement.querySelector('.showtimes');
            showtimesContainer.innerHTML = '';
            showtimesContainer.insertAdjacentHTML('beforeend', '<h4>Näytösajat</h4>');

            let upcomingShows = Array.from(shows).map(show => {
                return {
                    start: new Date(show.getElementsByTagName('dttmShowStart')[0].textContent),
                    element: document.createElement('p')
                };
            }).filter(show => show.start > currentDate);
            
            if (upcomingShows.length === 0) {
                showtimesContainer.appendChild(document.createTextNode('Ei tulevia näytösaikoja.'));
            } else {
                upcomingShows.forEach(show => {
                    show.element.textContent = formatTime(show.start.toISOString());
                    showtimesContainer.appendChild(show.element);
                });
            }
        })
        .catch(err => console.error('Virhe haettaessa näytösaikoja:', err));
}

const formatTime = (dateStr) => {
    const date = new Date(dateStr);
    const options = { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Helsinki' };
    return date.toLocaleString('fi-FI', options);
};
