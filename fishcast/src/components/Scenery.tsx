export default function Scenery({ compact = false }: { compact?: boolean }) {
  return (
    <svg
      className={`scenery ${compact ? 'compact' : ''}`}
      viewBox="0 0 900 620"
      aria-hidden="true"
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <linearGradient id="sky" x2="0" y2="1">
          <stop stopColor="#bfd4b5" />
          <stop offset="1" stopColor="#e8ebd5" />
        </linearGradient>
        <linearGradient id="water" x2="0.4" y2="1">
          <stop stopColor="#789b83" />
          <stop offset="1" stopColor="#315d4c" />
        </linearGradient>
        <pattern id="contours" width="180" height="150" patternUnits="userSpaceOnUse">
          <path
            d="M-20 90Q50-70 150 65T340 80M-20 105Q50-55 150 80T340 95M-20 120Q50-40 150 95T340 110M-20 135Q50-25 150 110T340 125"
            fill="none"
            stroke="#e5edcc"
            strokeWidth=".7"
            opacity=".27"
          />
        </pattern>
      </defs>
      <path fill="url(#sky)" d="M0 0H900V620H0z" />
      <circle cx="615" cy="126" r="49" fill="#f1edc8" />
      <path
        d="M0 267 90 185 145 226 253 102 310 170 372 125 489 273 592 190 654 241 780 133 900 225V620H0Z"
        fill="#8fae91"
      />
      <path
        d="m0 325 116-101 83 62 107-75 75 111 74-48 99 97 159-98 71 64 116-37v320H0Z"
        fill="#5d856d"
      />
      <path d="M0 410Q220 328 412 370T900 324V620H0Z" fill="url(#water)" />
      <path
        d="M494 352Q643 392 429 439T279 620H517Q346 511 587 444T712 351"
        fill="#bad0b7"
        opacity=".77"
      />
      <path d="M0 354 71 312 136 350 203 318 274 398 200 465 248 620H0Z" fill="#224f40" />
      <path d="m900 321-100 67-86-24-99 136 79 120h206Z" fill="#1b4439" />
      <path fill="url(#contours)" d="M0 0H900V620H0z" />
      <g fill="none" stroke="#e9ecd7" opacity=".55">
        <path d="m511 94 24-9 24 9M555 70l16-6 16 6M483 111l12-5 12 5" />
        <circle cx="502" cy="411" r="14" />
        <circle cx="502" cy="411" r="4" fill="#e9ecd7" />
      </g>
      <g fill="#eef2da" fontFamily="monospace" fontSize="12" letterSpacing="3">
        <text x="64" y="65">
          CHONGQING · FIELD NOTES
        </text>
        <text x="64" y="565">
          山水之间 / 下一次出发
        </text>
      </g>
    </svg>
  );
}
