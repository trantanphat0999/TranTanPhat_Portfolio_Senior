module.exports = {
  content: ['./index.html', './js/**/*.js'],
  safelist: [
    { pattern: /^(bg|text|border)-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(50|100|200|300|400|500|600|700|800|900|950)$/ },
    'bg-primary','text-primary','border-primary/20','bg-primary/10','bg-primary/5','text-primary/40',
  ],
  theme: { extend: {
    colors: {primary:'rgb(var(--theme-primary-rgb, 63 63 70) / <alpha-value>)',secondary:'rgb(var(--theme-accent-rgb, 82 82 91) / <alpha-value>)',accent:'rgb(var(--theme-accent-rgb, 113 113 122) / <alpha-value>)'},
    borderRadius: {none:'0px',sm:'4px',DEFAULT:'8px',md:'12px',lg:'16px',xl:'20px','2xl':'24px','3xl':'32px',full:'9999px',button:'8px'},
  } },
};
