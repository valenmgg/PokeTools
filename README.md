# PokéTools

PokéTools es una herramienta web para fans de Pokémon que reúne una Pokédex, consultas de movimientos y tipos, herramientas para crear y analizar equipos y distintos minijuegos.

🌐 **Demo:** https://poketools-nine.vercel.app/

## Funcionalidades

* Pokédex con más de 1000 Pokémon
* Estadísticas, habilidades, tipos y evoluciones
* Buscador de movimientos y Pokémon que pueden aprenderlos
* Tabla de efectividad de tipos
* Comparador de Pokémon
* Generador de equipos
* Analizador de equipos
* Buscador de habilidades, objetos y evoluciones
* Pokémon aleatorio y generador de nombres
* 8 minijuegos
* Desafío diario
* Sistema de favoritos
* Modo oscuro
* Diseño responsive

## Tecnologías

* HTML
* CSS
* JavaScript
* PokéAPI
* Vercel

El proyecto está desarrollado con JavaScript vanilla, sin frameworks.

## Datos

Los datos de Pokémon se obtienen mediante [PokéAPI](https://pokeapi.co/).

Los favoritos, preferencias de tema y puntuaciones de los juegos se almacenan localmente en el navegador mediante `localStorage`.

## Ejecutar localmente

Cloná el repositorio:

```bash
git clone https://github.com/valenmgg/PokeTools.git
cd PokeTools
```

Iniciá el servidor local:

```bash
node dev-server.js
```

Después abrí:

```text
http://localhost:3000
```

## Estructura

```text
PokeTools/
├── index.html
├── style.css
├── js/
├── scripts/
├── icons/
├── vercel.json
├── robots.txt
├── sitemap.xml
└── dev-server.js
```

## Proyecto

---

PokéTools es un proyecto de fans, sin fines comerciales ni afiliación con Nintendo, Game Freak o The Pokémon Company.
