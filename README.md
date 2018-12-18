# about ecoadvisor 
Backend model for Ecoadvisor project. Coded in Javascript without dependencies.
Steady state model by George Ekama. Implemented by Lluís Bosch
(lbosch@icra.cat).

## status: under development 

## Model assumptions
  - XOHO influent is 0
  - SVFA effluent is 0

## doubts/pending/ask george ekama
  - ?

## Lluís B. tasks (ordered by priority)
  - Separar balanços de process variables
  - [not finished] write equations in pdf (file "formulas.ms")
  - [pending] API
  - [pending] integrate constants.js to the code
  - [pending] ./activated-sludge.js: change kv to 0.07 (high value
    makes that BSO effluent is ≈ 0) 
  - [pending] add a 'see.php' source code syntax viewer for html
  - [done] check K-O in ASM1

## Future
  - add energy consumption module
  - add anaerobic digestion module
  - add stoichiometry for CO2 produced

## done/solved/clear/discussed
  - [as model] confirm final Rsm formula (min sludge age to ensure nitrification).
  - [as model] add errors in nitrification when: (1) fxt > fxm, (2) Rs  < Rsm
  - [as model] add incomplete BOD removal
  - [as model] mass of nitrifiers (MX-BA) no worry about it (<3% of MX-T)
  - [as model] anoxic volume (fxt related)
  - [as model] pH sensitivity in nitrification
  - [as model] DO inhibition in nitrification
  - [as model] denitrification outputs (units and descriptions)
  - [as model] Qw wastage (waste from reactor or sst)
  - [as model] extra-iSS produced in CPR to wastage and MX-IO
  - [as model] influent nitrate (NOx): if we have influent NOx, TOD balance not closing.
  - [as model] OHO as a new state variable
  - [as model] why is kg of FeCl3 added is not equal to the extra iSS produced
    (for example 3000 kg FeCl3 produces ~2500 kg iSS. The remaining ~500 kg is
    Cl(-) ion?).
  - [as model] let Dp1RBSO = Sbsi·(1-fCV·YH)/2.86;
  - [river] R20 and k for NH4 and PO4
  - [river] names S-OP and S-FSA to PO4 and NH4 in the interface only
  - [gui] generate links for fase1.html
