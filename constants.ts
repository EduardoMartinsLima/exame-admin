import { Rank } from './types';

export const RANKS: Rank[] = [
  'Branca',
  'Branca Ponteira Amarela',
  'Cinza',
  'Amarela',
  'Vermelha',
  'Laranja',
  'Verde',
  'Verde I',
  'Verde II',
  'Verde III',
  'Roxa',
  'Marrom',
  'Preta'
];

export const MOCK_DATA = {
  senseis: [
    { id: 's1', name: 'Sensei Miyagi' },
    { id: 's2', name: 'Sensei Kreese' }
  ],
  students: [
    { id: 'st1', name: 'Daniel LaRusso', currentRank: 'Branca', sex: 'M', cpf: '123.456.789-00' },
    { id: 'st2', name: 'Johnny Lawrence', currentRank: 'Amarela', sex: 'M', cpf: '987.654.321-00' }
  ]
};