// .babelrc.js
{
    plugins: [
        // JSX
        ['@babel/plugin-transform-react-jsx', {
        pragma: 'VM.h',
        pragmaFrag: 'VM.Fragment',
        }],
    ]
}