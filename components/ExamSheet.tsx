import React from 'react';
import { Student, Exam, ExamRegistration } from '../types';
import { KarateLogo } from './KarateLogo';
import { Scissors } from 'lucide-react';

// --- DATA LISTS ---
const LISTS = {
    ataques: ['Oi Zuki', 'Sambon Zuki', 'Gyaku Zuki', 'Empi Uchi', 'Shuto Uchi', 'Uraken Uchi', 'Tate Zuki', 'Tobi Komi Zuki', 'Nagashi Zuki', 'Nukite', 'Mawashi Enpi'],
    defesas: ['Gedan Barai', 'Age Uke', 'Soto Ukei', 'Uchi Uke', 'Shuto Uke', 'Nagashi Uke', 'Morote Uke', 'Sukui Uke'],
    pernas: ['Mae-Geri Keage', 'Mae-Geri Kekomi', 'Kizami-Geri', 'Mae-Len Geri', 'Mae Yoko Len Geri', 'Yoko Geri Keage', 'Yoko Geri Kekomi', 'Yoko Len Geri', 'Mawashi Geri', 'Hitsu Geri', 'Mae Tobi Geri', 'Ura Mawashi Geri', 'Ushiro Geri', 'Mikazuki Geri'],
    renzoku: [1,2,3,4,5].map(i => `Renzoku Waza ${i}`),
    bases: ['Zenkutsu-Dachi', 'Kokutsu-Dachi', 'Kiba-Dachi', 'Nekoashi-Dachi', 'Hangetsu-Dachi', 'Sochin-Dachi'],
    kata: ['Instabilidade', 'Embu Zen', 'Espírito', 'Vista', 'Cintura', 'Kime', 'Kiai', 'Ritmo', 'Precisão', 'Forma'],
    kumite: ['Ataque', 'Defesa', 'Contra-Ataque', 'Distância', 'Eficiência', 'Kime', 'Confiança', 'Tempo', 'Esquiva', 'Zanchin'],
    quadril: ['Vibração', 'Levante', 'Rami', 'Encaixe'],
    bracos: ['Rikite', 'Dobra cotovelo', 'Cotovelo costela', 'Giro do punho', 'Mão na cintura'],
    pernas_detalhe: ['Rikiashi', 'Joelho', 'Passa pé', 'Equilíbrio', 'Posição do pé', 'Calcanhar', 'Mexe pé', 'Dobra perna frente', 'Estira perna de trás'],
    gerais: ['Concentração', 'Coordenação', 'Espírito', 'Uniforme', 'Postura', 'Vista', 'Respiração', 'Kime', 'Velocidade', 'Condição Física', 'Kiai']
};

// --- COMPONENTS ---
const CheckBox: React.FC = () => (
  <div className="w-3 h-3 border border-black inline-block align-middle bg-white"></div>
);

const SectionTitle: React.FC<{ title: string }> = ({ title }) => (
  <div className="bg-black text-white text-center font-bold text-[10px] uppercase py-0.5 border border-black leading-none">
    {title}
  </div>
);

const ListItem: React.FC<{ label: string }> = ({ label }) => (
  <div className="flex justify-between items-end text-[9px] leading-tight border-b border-gray-400 border-dotted pt-[1px]">
    <span className="truncate pr-1">{label}</span>
    <CheckBox />
  </div>
);

// --- SHARED HEADER ---
interface HeaderProps {
    student: Student;
    exam: Exam;
    registration: ExamRegistration;
    senseiName?: string;
    isRightSide?: boolean;
}

const SharedHeader: React.FC<HeaderProps> = ({ student, exam, registration, senseiName, isRightSide }) => {
    // Calculate Age
    const getAge = (birthDateString?: string) => {
        if (!birthDateString) return '';
        const today = new Date();
        const birthDate = new Date(birthDateString);
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
        }
        return age;
    };

    const formatDate = (dateString: string) => {
        if (!dateString) return '';
        const [year, month, day] = dateString.split('-').map(Number);
        return new Date(year, month - 1, day).toLocaleDateString('pt-BR');
    };

    // Helper to get color class based on rank name
    const getRankColorClasses = (rank: string) => {
        const r = rank.toLowerCase();
        // Uses print: classes to ensure colors appear when printing (if 'Background Graphics' is enabled)
        if (r.includes('amarela')) return 'bg-yellow-300 print:bg-yellow-300';
        if (r.includes('vermelha')) return 'bg-red-600 text-white print:bg-red-600 print:text-white';
        if (r.includes('laranja')) return 'bg-orange-400 print:bg-orange-400';
        if (r.includes('verde')) return 'bg-green-600 text-white print:bg-green-600 print:text-white';
        if (r.includes('roxa')) return 'bg-purple-700 text-white print:bg-purple-700 print:text-white';
        if (r.includes('marrom')) return 'bg-[#5D4037] text-white print:bg-[#5D4037] print:text-white';
        if (r.includes('preta')) return 'bg-black text-white print:bg-black print:text-white';
        return 'bg-white print:bg-white'; // Default/White/Greyish
    };

    return (
        <div className="border-2 border-black mb-1 text-[9px] text-black">
            {/* Title Block */}
            <div className="flex items-center justify-between px-1 py-0.5 border-b border-black">
                <KarateLogo size={24} className="text-black" />
                <div className="text-center flex-1">
                    <h1 className="text-sm font-bold uppercase leading-tight">FKBA - FEDERAÇÃO DE KARATÊ DA BAHIA</h1>
                </div>
            </div>
            <div className="bg-black text-white text-center font-bold uppercase py-0.5 text-xs leading-none">
                Exame de Faixa
            </div>

            {/* Basic Info */}
            <div className="grid grid-cols-12 gap-0 divide-x divide-black border-b border-black">
                <div className="col-span-8 p-0.5 flex items-center overflow-hidden">
                    <span className="font-bold mr-1 whitespace-nowrap">Clube:</span> <span className="truncate">ASSOCIAÇÃO DE KARATÊ KOBUDO</span>
                </div>
                <div className="col-span-4 p-0.5 flex items-center justify-center">
                    <span className="font-bold mr-1">Data:</span> {formatDate(exam.date)}
                </div>
            </div>

            <div className="grid grid-cols-12 gap-0 divide-x divide-black border-b border-black">
                <div className="col-span-8 p-0.5 flex items-center">
                    <span className="font-bold mr-1">Atleta:</span> <span className="uppercase font-bold truncate text-xs">{student.name}</span>
                </div>
                <div className="col-span-4 p-0.5 flex items-center">
                    <span className="font-bold mr-1">Sensei:</span> <span className="uppercase truncate">{senseiName || '-'}</span>
                </div>
            </div>
            
            {/* Admission/Age */}
            <div className="grid grid-cols-12 gap-0 divide-x divide-black border-b border-black">
                {isRightSide ? (
                     <div className="col-span-12 p-0.5 grid grid-cols-12">
                        <div className="col-span-8 font-bold text-sm text-center flex items-center justify-center">
                            Resultado do Exame de Faixa:
                        </div>
                        {/* Colored Box for Target Rank (Athlete Side) - UPDATED: Single Line */}
                        <div className={`col-span-4 flex items-center justify-center border-l border-black px-1 ${getRankColorClasses(registration.targetRank)}`}>
                             <span className="text-[9px] font-bold mr-1 opacity-80">Para:</span>
                             <span className="font-bold text-[10px] leading-none uppercase">{registration.targetRank}</span>
                        </div>
                     </div>
                ) : (
                    <>
                        <div className="col-span-4 p-0.5"><span className="font-bold mr-1">Idade:</span> {getAge(student.birthDate)}</div>
                        <div className="col-span-8 p-0.5"><span className="font-bold mr-1">Data Nasc.:</span> {formatDate(student.birthDate || '')}</div>
                    </>
                )}
            </div>
            
            {/* Rank Info */}
            <div className="grid grid-cols-12 gap-0 divide-x divide-black">
                {isRightSide ? (
                    <>
                         <div className="col-span-8 grid grid-cols-3 divide-x divide-black text-[8px] p-0.5">
                             <div>Kihon:</div>
                             <div>Kata:</div>
                             <div>Kumitê:</div>
                         </div>
                         <div className="col-span-4"></div>
                    </>
                ) : (
                    <>
                        <div className="col-span-6 p-0.5"><span className="font-bold mr-1">Faixa Atual:</span> {student.currentRank}</div>
                        {/* Colored Box for Target Rank (Federation Side) */}
                        <div className="col-span-6 p-0 flex items-stretch">
                            <span className="font-bold mr-1 p-0.5 bg-gray-100 print:bg-gray-100 border-r border-black flex items-center">Para Faixa:</span> 
                            <span className={`flex-1 flex items-center justify-center font-bold uppercase text-[9px] ${getRankColorClasses(registration.targetRank)}`}>
                                {registration.targetRank}
                            </span>
                        </div>
                    </>
                )}
            </div>

            {/* Bottom Row Header */}
            <div className="border-t border-black">
                 {isRightSide ? (
                     <div className="grid grid-cols-12 divide-x divide-black">
                         <div className="col-span-4 p-0.5 flex items-center text-[9px]">
                             <span className="font-bold mr-1">Média Final:</span>
                         </div>
                         <div className="col-span-4 p-0.5 flex justify-center gap-2 text-[8px] items-center">
                             <span>APROVADO</span> <div className="w-3 h-3 border border-black"></div>
                             <span>REPROVADO</span> <div className="w-3 h-3 border border-black"></div>
                         </div>
                         <div className="col-span-4 p-0.5 text-[7px]">
                             <div className="font-bold text-center border-b border-black mb-0.5">GRAU DOS DEFEITOS</div>
                             <div className="flex justify-between items-center px-0.5">
                                 <span>LEVE</span> <div className="w-2 h-2 border border-black"></div>
                                 <span>MÉD</span> <div className="w-2 h-2 border border-black bg-gray-300"></div>
                                 <span>GRV</span> <div className="w-2 h-2 border border-black bg-black"></div>
                             </div>
                         </div>
                     </div>
                 ) : (
                     <div className="grid grid-cols-12 divide-x divide-black">
                        <div className="col-span-12 grid grid-cols-2 divide-x divide-black">
                            <div className="text-center">
                                <div className="border-b border-black text-[8px]">Conceito de Conduta</div>
                                <div className="grid grid-cols-3 text-[8px]">
                                    <div>Bom</div>
                                    <div className="border-l border-r border-black">Regul.</div>
                                    <div>Fraco</div>
                                </div>
                            </div>
                            <div className="text-center">
                                <div className="border-b border-black text-[8px]">Conceito de Frequência</div>
                                <div className="grid grid-cols-3 text-[8px]">
                                    <div>Bom</div>
                                    <div className="border-l border-r border-black">Regul.</div>
                                    <div>Fraco</div>
                                </div>
                            </div>
                        </div>
                     </div>
                 )}
            </div>
        </div>
    );
};

// --- LEFT PAGE (FEDERATION) ---
const FederationSide: React.FC<HeaderProps> = (props) => {
    return (
        <div className="h-full flex flex-col text-black">
            <SharedHeader {...props} />
            
            <div className="flex-1 flex flex-col gap-1">
                 {/* Scores Table */}
                <div className="border-2 border-black mb-1">
                    <div className="grid grid-cols-6 bg-gray-100 print:bg-gray-100 text-center font-bold border-b-2 border-black text-[8px]">
                        <div className="col-span-1 border-r border-black py-0.5">TESTES</div>
                        <div className="col-span-1 border-r border-black py-0.5">1ª</div>
                        <div className="col-span-1 border-r border-black py-0.5">2ª</div>
                        <div className="col-span-1 border-r border-black py-0.5">MÉDIA</div>
                        <div className="col-span-2 py-0.5">EXAMINADOR</div>
                    </div>
                    {['KIHON', 'KATA', 'KUMITÊ', 'C. GERAIS'].map((item, idx) => (
                        <div key={item} className={`grid grid-cols-6 text-center ${idx < 3 ? 'border-b border-black' : ''} h-8`}>
                            <div className="col-span-1 border-r border-black flex items-center justify-center font-bold text-[8px] bg-gray-50 print:bg-gray-50 px-0.5 leading-tight">{item}</div>
                            <div className="col-span-1 border-r border-black"></div>
                            <div className="col-span-1 border-r border-black"></div>
                            <div className="col-span-1 border-r border-black"></div>
                            <div className="col-span-2"></div>
                        </div>
                    ))}
                </div>
                
                {/* Final Result */}
                <div className="border-2 border-black p-0.5 flex items-center justify-between text-[9px] h-8">
                    <span className="font-bold pl-2">NOTA FINAL:</span>
                    <div className="flex gap-4 pr-2">
                        <div className="flex items-center gap-1"><span>APROVADO</span> <div className="w-4 h-4 border border-black"></div></div>
                        <div className="flex items-center gap-1"><span>REPROVADO</span> <div className="w-4 h-4 border border-black"></div></div>
                    </div>
                </div>

                {/* Observations */}
                <div className="border-2 border-black flex-1 flex flex-col min-h-[40px]">
                    <div className="border-b border-black px-1 font-bold bg-gray-100 print:bg-gray-100 text-[9px]">OBSERVAÇÕES:</div>
                    <div className="flex-1"></div>
                </div>

                {/* Signatures */}
                <div className="grid grid-cols-2 border-2 border-black mt-auto">
                    <div className="border-r border-black p-0.5 pt-6 text-[8px] leading-none text-left">Chefe da banca:</div>
                    <div className="p-0.5 pt-6 text-[8px] leading-none text-left">Secretaria:</div>
                </div>
            </div>
        </div>
    );
};

// --- RIGHT PAGE (ATHLETE) ---
const AthleteSide: React.FC<HeaderProps> = (props) => {
    return (
        <div className="h-full flex flex-col text-black">
            <SharedHeader {...props} isRightSide={true} />
            
            <div className="border-2 border-black flex flex-col flex-1 min-h-0">
                <div className="bg-black text-white text-center font-bold uppercase py-0.5 mb-0.5 text-[10px] leading-none">DETALHAMENTO</div>
                
                <div className="grid grid-cols-3 gap-1 px-1 flex-1">
                    {/* Col 1 */}
                    <div className="flex flex-col gap-0.5">
                        <div>
                            <SectionTitle title="ATAQUES DE MÃOS" />
                            <div className="border border-t-0 border-black px-0.5 pb-0.5">
                                {LISTS.ataques.map(i => <ListItem key={i} label={i} />)}
                            </div>
                        </div>
                        <div>
                            <SectionTitle title="DEFESAS" />
                            <div className="border border-t-0 border-black px-0.5 pb-0.5">
                                {LISTS.defesas.map(i => <ListItem key={i} label={i} />)}
                            </div>
                        </div>
                        <div>
                            <SectionTitle title="TÉCNICAS DE PERNAS" />
                            <div className="border border-t-0 border-black px-0.5 pb-0.5">
                                {LISTS.pernas.map(i => <ListItem key={i} label={i} />)}
                            </div>
                        </div>
                    </div>

                    {/* Col 2 */}
                    <div className="flex flex-col gap-0.5">
                        <div>
                            <SectionTitle title="RENZOKU WAZA" />
                            <div className="border border-t-0 border-black px-0.5 pb-0.5">
                                {LISTS.renzoku.map(i => <ListItem key={i} label={i} />)}
                            </div>
                        </div>
                        <div>
                            <SectionTitle title="BASES" />
                            <div className="border border-t-0 border-black px-0.5 pb-0.5">
                                {LISTS.bases.map(i => <ListItem key={i} label={i} />)}
                            </div>
                        </div>
                        <div>
                            <SectionTitle title="KATA" />
                            <div className="border border-t-0 border-black px-0.5 pb-0.5">
                                {LISTS.kata.map(i => <ListItem key={i} label={i} />)}
                            </div>
                        </div>
                        <div>
                            <SectionTitle title="KUMITE" />
                            <div className="border border-t-0 border-black px-0.5 pb-0.5">
                                {LISTS.kumite.map(i => <ListItem key={i} label={i} />)}
                            </div>
                        </div>
                    </div>

                    {/* Col 3 */}
                    <div className="flex flex-col gap-0.5">
                        <div>
                            <SectionTitle title="QUADRIL" />
                            <div className="border border-t-0 border-black px-0.5 pb-0.5">
                                {LISTS.quadril.map(i => <ListItem key={i} label={i} />)}
                            </div>
                        </div>
                        <div>
                            <SectionTitle title="BRAÇOS" />
                            <div className="border border-t-0 border-black px-0.5 pb-0.5">
                                {LISTS.bracos.map(i => <ListItem key={i} label={i} />)}
                            </div>
                        </div>
                        <div>
                            <SectionTitle title="PERNAS" />
                            <div className="border border-t-0 border-black px-0.5 pb-0.5">
                                {LISTS.pernas_detalhe.map(i => <ListItem key={i} label={i} />)}
                            </div>
                        </div>
                        <div>
                            <SectionTitle title="GERAIS" />
                            <div className="border border-t-0 border-black px-0.5 pb-0.5">
                                {LISTS.gerais.map(i => <ListItem key={i} label={i} />)}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Obs Full Width */}
                <div className="px-1 pb-1 mt-auto">
                     <div className="border border-black p-0.5 min-h-[40px] text-[8px] flex flex-col">
                        <span className="font-bold mb-1">Obs.:</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

interface Props {
  student: Student;
  exam: Exam;
  registration: ExamRegistration;
  senseiName?: string;
}

export const ExamSheet: React.FC<Props> = (props) => {
  return (
    <div className="w-full h-full flex flex-row items-stretch justify-between bg-white overflow-hidden p-[5mm]">
        {/* Left Sheet: Federation Copy */}
        <div className="w-[48%] h-full">
            <FederationSide {...props} />
        </div>

        {/* Center Cut Line */}
        <div className="relative w-[4%] flex flex-col items-center justify-center">
             <div className="h-full border-l-2 border-dashed border-gray-400"></div>
             <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white p-1">
                <Scissors size={16} className="text-gray-500 transform rotate-90" />
             </div>
        </div>

        {/* Right Sheet: Athlete Copy */}
        <div className="w-[48%] h-full">
            <AthleteSide {...props} />
        </div>
    </div>
  );
};