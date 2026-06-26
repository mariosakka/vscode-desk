STANDARDS DOC

Principiu central: Comunicarea proactiva. Anunta schimbarile si problemele cand iti dai seama, nu dupa fapt. Asta e regula principala si se aplica la tot.


CANALE SLACK

Pentru claritate, urmatoarele canale sunt referentiate explicit in doc:
- #zdev-status: disponibilitate (SOD/EOD, pauze lungi, plecari devreme/intarzieri, concediu post-aprobare, situatii neprevazute).
- #zdev-general: coordonare zilnica (discutii, intrebari, "gata de review").
- #zdev-weekly: ritm saptamanal (statusul saptamanal).
- #zdev-pulse: starea task-urilor in lucru - thread-urile task-urilor peste 1 zi (alinieri), plus semnalele automate de review (reviewer pus, ready-to-merge, coada de review).
- #zdev-deploy: anunturi de deploy in productie.


TOOLING (SKILL-URI)

Skill-urile referentiate in doc (issue creation, /issue-alignment etc.) vin din repo-ul partajat Colete-Online/ai-tooling. Le instalezi o singura data in Claude Code: "/plugin marketplace add Colete-Online/ai-tooling", apoi "/plugin install co-ops@ai-tooling".


SECTIUNEA 1: PROGRAMUL DE LUCRU

Programul standard este 8 ore de munca + 30 min pauza = 8.5 ore.
Suprapunerea obligatorie a echipei: 11:00 - 16:00, cand toti trebuie sa fie online si disponibili.
In afara acestor ore (11-16), flexibilitatea pe inceput si sfarsit e OK, dar:
1. Start-of-day: postezi in #zdev-status un mesaj scurt ("salut, sunt pe COL-X azi") la inceputul zilei.
2. End-of-day: postezi in #zdev-status un mesaj scurt ("Inchid. Am terminat X / maine continui pe Y") la sfarsitul zilei. Daca vei continua in aceeasi zi mai tarziu, scrii acest lucru explicit si repeti SOD/EOD pentru noul interval. Daca nu vei lucra 8 ore legate, anunti din timp ca vei pleca mai devreme.
3. Daca vii dupa 11:00, anunti in DM Alex cat mai din timp posibil.
4. Orice timp luat in afara orarului standard de munca (plecare devreme, pauze lungi de la pranz, programari medicale, etc.) se anunta in DM Alex, plus mesaj in #zdev-status pentru vizibilitatea echipei (fara detalii in canal):
   - Pentru evenimente planificate: cu cel putin o zi inainte.
   - Pentru lucruri nepredictibile (urgente, nu te simti bine, etc.): imediat ce poti.
5. Pauzele lungi (peste 30 min standard) nu reduc cele 8 ore de munca. Recuperezi dupa (ex: start of day la 9:00, pauza 14:00-15:30, end of day ar fi 18:30).
Regula se aplica identic la zilele de birou si la WFH.

Pentru cei part-time: contractual, orele sunt distribuite pe toata saptamana (ex: 8h/saptamana = 1.6h/zi). Daca o sarbatoare legala cade intr-o zi cand ai ales sa lucrezi, restul se recupereaza in alta zi din saptamana. Exemplu: lucrezi 8h/saptamana intr-o singura zi, si acea zi pica in sarbatoare. Sarbatoarea acopera 1.6h. Mai ai 6.4h de lucrat in saptamana respectiva.
De asemenea, cei part-time care nu lucreaza in aceleasi zile in fiecare saptamana trebuie sa posteze in #zdev-status zilele in care vor lucra in saptamana urmatoare, ideal in ultima lor zi lucratoare din saptamana curenta. In caz ca nu stiu inca atunci, limita maxima este sambata.
Scopul SOD/EOD este vizibilitate si predictibilitate, atat pentru cei de la birou cat si pentru cei care lucreaza de acasa in ziua respectiva. In felul acesta comunicarea e mai usoara, stiind cu cine se poate discuta si cand.


SECTIUNEA 2: COMUNICARE PE SLACK

Slack este canalul principal de comunicare. Asteptarea: in timpul orelor de lucru sa fii prezent si sa raspunzi.
1. Raspuns la @-mentions (de la oricine), @here si DM-uri in maximum 1h.
2. Mesaje cu @channel: raspuns din partea tuturor in maximum 48h in timpul saptamanii.


SECTIUNEA 3: SINCRONIZARE ECHIPA

Sedinta saptamanala (vineri 16:00) este parte din munca, nu optionala. Prezenta e obligatorie. Daca nu poti participa, anunti in DM Alex inainte de 11:00 in dimineata respectiva (sau mai devreme daca stii din timp). Statusul async se posteaza oricum, indiferent daca poti sau nu sa participi la sedinta.
Pe langa trecerea in revista a statusurilor, sedinta stabileste si prioritatile pentru saptamana urmatoare: se revizuieste ordinea issue-urilor din To Do, ca toata lumea sa stie ce urmeaza si de unde isi ia urmatorul task (vezi sectiunea 4).
Statusul saptamanal se posteaza in #zdev-weekly pana vineri la ora 15:00, conform template-ului pinned. Format: Focus / Blocaje / Ajutor necesar. Toate task-urile mentionate trebuie sa aiba issue (format: #N titlu, ex: #214 Map widget). Daca lucrezi la ceva fara issue, intai creezi issue-ul. Postat ca mesaj nou in canal, nu reply in thread.
Pentru cei part-time: statusul poate fi postat in ultima zi lucratoare a saptamanii (ex: lucrezi luni-marti, postezi marti).
Statusul nu e optional. Postarea tarzie sau lipsa este o problema.


SECTIUNEA 4: BOARD, STATUSURI SI ALEGEREA TASK-URILOR (GITHUB PROJECTS)

Board-ul arata starea reala a muncii. Statusurile se misca singure unde se poate, deci nu trebuie intretinute manual.
Statusuri: To Do -> In Progress -> In Review -> Done
- To Do: issue-ul e pe board si poate fi luat in lucru. Daca te-ai asignat dar inca nu ai primit ok de start, ramane tot aici.
- In Progress: la task-urile > 8h, il muti tu dupa confirmarea alinierii (sectiunea 5). La task-urile <= 8h: cand incepi lucrul. In Progress inseamna "se lucreaza, cu ok".
- In Review: cand consideri task-ul gata (testat, cu comentariile AI rezolvate - criteriile complete in sectiunea 6) faci PR-ul "Ready for review" si issue-ul trece automat aici; altcineva face review. Daca modificarile cerute sunt mici, ramane In Review pana la approve; daca sunt mari, PR-ul se intoarce in draft si issue-ul revine In Progress.
- Done: automat, la merge. Verificarea in productie ramane pe autor (sectiunea 6, pasul "Verificare in productie"); daca pica, se redeschide.

Cum ajung issue-urile pe board
Oricine poate crea issue-uri (bug-uri, idei, regresii, research, raportari de la suport), prin skill-ul de issue creation, ca sa aiba toate aceeasi structura. Un issue nou traieste in repo pana e gata de lucru - crearea lui nu il pune pe board.
Un issue ajunge pe board (in To Do) cu label-ul approved pe issue. Cand pui label-ul, o automatizare adauga singura issue-ul pe board, in To Do, si completeaza Estimate-ul din linia "Estimare:" scrisa de skill in corpul issue-ului. Label-ul approved poate fi pus de oricine are ok-ul lui Alex (deocamdata), dar trebuie sa se vada de la cine vine ok-ul (un comentariu scurt: "ok de la Alex, discutat in standup"). Fara approved, issue-ul nu trece in To Do.
Daca un issue n-a fost creat prin skill si nu are linia "Estimare:", automatizarea il pune pe board dar lasa un comentariu ca lipseste Estimate-ul - il completezi manual.
Prioritatea din To Do o stabileste Alex si se revizuieste vineri in sync, ca toata lumea sa stie ce urmeaza.

Estimate (ore)
Estimatul in ore reflecta timpul aproximativ estimat pentru task. Cand pui approved, automatizarea copiaza valoarea in field-ul Estimate de pe board. Poate fi modificat la aliniere (sectiunea 5). Estimatul are doua roluri: alege ruta task-ului si iti da un reper de timp - ca sa nu stai prea mult pe ceva simplu si, daca totusi creste peste el, sa se vada (regula de intarziere, sectiunea 5).
- <= 8h: ruta task-urilor sub 1 zi - fara aliniere formala (sectiunea 5).
- > 8h: ruta de aliniere (sectiunea 5). La final de aliniere, tu si cel care lucreaza task-ul rescrieti Estimate-ul impreuna, o singura data - atunci stiti mai mult decat la inceput. Valoarea noua o inlocuieste pe prima.
Dupa asta Estimate-ul ramane fix. Acesta nu este un termen-limita si nici o nota de performanta, dar depasirea lui trebuie anuntata si discutata.
Daca iei un task de <= 8h si, cand intri in cod, vezi ca e mai mare, mergi pe procesul de aliniere si rescriem estimarea.

Cum iti iei urmatorul task
Doua cai (deocamdata): ori iti da Alex un task direct, ori, daca nu ti-a dat, iti alegi singur din To Do. Alegerea inseamna ca propui - nu ca incepi neaparat:
- Alegi din primele 3 issue-uri neasignate din To Do si te asignezi. Primul care se asigneaza il ia. Nu cobori mai adanc in lista de unul singur; daca niciunul din primele 3 nu ti se potriveste, spui in #zdev-general.
- Issue-ul ramane in To Do pana la start.
- Daca te razgandesti sau te blochezi: scoti self-assign-ul si lasi un comentariu scurt cu motivul (nu se potriveste / prioritate schimbata / blocat). Issue-ul redevine liber pentru primii 3. Daca era deja In Progress, il muti inapoi in To Do cu aceeasi nota.
- Task <= 8h: poti incepe direct, fara sa astepti. Daca, intrand in cod, vezi ca e mai mare, deschizi alinierea (sectiunea 5).
- Task > 8h: te asignezi, faci explorarea si postezi comentariul de aliniere (sectiunea 5). Ok-ul de start vine odata cu confirmarea alinierii - atunci muti issue-ul in In Progress. Pana atunci nu incepi implementarea pe abordarea neconfirmata (poti scrie cod de proba cat sa o validezi).
Poti propune urmatorul task cand cel curent intra In Review. Prioritatea ramane pe task-ul vechi: re-review-urile si verificarea in productie trec inaintea celui nou. Poti avea mai multe task-uri in paralel daca le duci - fiecare cu alinierea, regula de intarziere si statusul lui.

Asignare directa si task-uri rezervate
Un task poate fi asignat direct unei persoane. Un issue deja asignat e rezervat - nu il preia altcineva din To Do. Restul fluxului e identic: aliniere daca e peste 8h, acelasi DoD, acelasi review.

Un issue = un PR
Un issue se rezolva, de regula, printr-un singur PR. Daca chiar e nevoie de mai multe, doar ultimul inchide issue-ul (closes #X); celelalte doar il referentiaza. Daca un task pare sa ceara mai multe PR-uri, probabil cerea de fapt mai multe issue-uri - spune la aliniere.

Singura regula de igiena manuala: issue-urile lasate In Progress fara activitate peste 10 zile apar intr-un raport automat saptamanal - unde activitate inseamna ultimul comentariu (pe issue sau pe PR-ul legat), commit/push pe branch-ul PR-ului, sau update pe un PR draft; nu doar updated_at. Daca esti pe lista, ori scrii statusul real pe issue, ori il muti inapoi in To Do cu o nota scurta. Exceptie: blocajele externe (marcate cu label blocked si documentate pe issue) raman In Progress si sunt excluse din raport.


SECTIUNEA 5: WORKFLOW PENTRU TASK-URI ESTIMATE LA PESTE 1 ZI

Scopul: nimeni nu pierde zile pe o directie gresita si nimeni nu afla tarziu ca un task a crescut. Sursa de adevar e issue-ul de GitHub. Mesajele importante ajung automat si in #zdev-pulse, prin integrarea GitHub-Slack - nu scrii nimic de doua ori.

Cum incepi un task
1. Te asignezi pe issue (cum alegi urmatorul task: sectiunea 4). Asta inseamna ca task-ul e al tau, iar regulile de review se leaga de asignare.
2. Explorare, limitata la 2-4 ore: citesti codul, intelegi problema. Nu se termina la ceas, ci cand postezi comentariul de aliniere pe issue (il poti structura cu skill-ul /issue-alignment), cu:
   - cum intelegi problema (cu cuvintele tale, nu titlul reformulat);
   - abordarea (module / fisiere / pasi, pe scurt);
   - estimarea ta in ore (propunere pentru noul Estimate - se confirma impreuna la pasul 4);
   - riscuri si necunoscute.
   Daca task-ul cere mai mult de 4 ore doar de investigatie, faci un issue separat de research, cu DoD-ul lui. Poti scrie cod de proba cat sa verifici ca abordarea tine, dar nu incepi implementarea pe o abordare neconfirmata.
3. Self-check si label. Rulezi /issue-alignment-check pe comentariu - semnaleaza ce lipseste (module atinse nementionate, conflicte cu arhitectura); rezolvi ce e evident. Apoi pui label-ul, care declanseaza un mesaj in #zdev-pulse:
   - alignment-ready daca ai o abordare - gata de confirmat (pasul 4).
   - needs-alignment-help daca tot nu poti formula o abordare - postezi "uite ce nu inteleg" si sare cineva sa te ajute (nu doar Alex). E un rezultat valid, nu un esec; dupa ce iese o abordare, treci pe alignment-ready.
4. Confirmarea. Alex (sau cel care a creat issue-ul) raspunde cat de repede poate:
   - abordare ok: confirmare scurta. Asta e si ok-ul de start - acum poti muta in In Progress. Tot acum rescrieti Estimate-ul impreuna (sectiunea 4) - fata de el se masoara intarzierea. Si tot acum se decide, de obicei, daca task-ul ia label-ul needs-2-reviews (sectiunea 6).
   - obiectii: discutati pana va aliniati (call, fata in fata, sau comentarii pe issue). Rezumatul il scrii tu pe issue.
   Cat astepti confirmarea, faci review-uri din coada, apoi bug-uri mici.
5. Dupa confirmare muti issue-ul in In Progress si incepi sa scrii cod.

In timpul lucrului (totul prin comentarii pe issue):
- Intarziere peste 50% fata de Estimate (sau peste 1 zi): postezi chiar in ziua in care iti dai seama, doar cu noua estimare. Fara justificari pe loc.
- Blocaj extern (depinzi de cineva sau de ceva): postezi imediat, nu astepti in tacere.
- Scope mai mare decat credeai: postezi imediat ce iti dai seama, cu implicatiile, si discutati.

Cand se inchide task-ul (la merge): in comentariul final, daca ai depasit estimarea, scrii o singura linie - "ce stim acum si nu stiam la estimare". Cautam contextul care a lipsit, nu vinovatul.

Task-uri sub 1 zi: fara aliniere formala - SOD-ul si statusul saptamanal acopera vizibilitatea. Daca un task sub 1 zi creste peste 1 zi, postezi comentariul de aliniere retroactiv, doar cu noua estimare; explicatia vine la final, ca mai sus.

Task-uri foarte complexe (decizii de arhitectura, peste o saptamana): poti deschide un canal dedicat pentru discutii. Canalul e in plus; issue-ul ramane sursa de adevar pentru estimare si status. Cand task-ul e gata, arhivezi canalul.

Re-aliniere periodica (task-uri mari): re-aliniezi cand e nevoie, dar minim o data pe saptamana. Postezi pe issue o re-aliniere scurta - ce ai facut, ce a ramas, daca abordarea sau estimarea s-au schimbat - si re-confirmi. Comentariu scurt, fara label nou; il poti structura cu /issue-alignment. Scopul: sa nu mergi 2-3 saptamani pe o directie neverificata.

Estimarea gresita e normala. Tacerea cand vezi ca depasesti, nu.


SECTIUNEA 6: DEFINITION OF DONE SI REVIEW-UL

Un task e "done" cand PR-ul e merged. Verificarea in productie ramane pe autor, dupa deploy (pasul "Verificare in productie").
PR-urile se deschid din contul partajat (cel pe care e configurat agentul AI) si pornesc automat ca draft, legate de issue. Pentru ca vin din cont partajat, asignarea pe issue e obligatorie: asigneeul issue-ului e autorul, iar regulile de review se leaga de el.

Fluxul unui PR
1. Draft + review AI. PR-ul porneste draft. Agentul AI face review, rezolvi, iterezi. Aici nu intra niciun om, iar issue-ul ramane In Progress.
2. Self-review. Inainte sa-l faci ready, iti citesti propriul diff si lasi comentarii pe ce nu e evident: care e partea riscanta, ce fisiere sunt atinse doar de un rename, ce e copiat din alt modul. Un PR mare fara nicio adnotare a autorului e semn prost.
3. Ready for review. Apesi "Ready for review" doar cand:
   - functionalitatea e testata local si merge;
   - CI-ul trece (build, teste, linting);
   - review-ul AI a rulat (/review, /simplify, /pr-merge-check pe diff) si comentariile importante sunt rezolvate;
   - PR-ul are descriere clara: ce s-a schimbat, de ce (link la issue), cum se testeaza;
   - nu ai bagat modificari fara legatura cu task-ul;
   - PR-ul are dimensiune rezonabila pentru review. Daca e mare, ori il imparti, ori explici in descriere de ce nu se poate;
   - ai facut self-review-ul (pasul 2).
4. Review uman. Cand PR-ul devine ready, automatizarea pune un reviewer (rotatie dupa incarcare, fara asigneeul issue-ului, doar oameni aflati in zilele lor de lucru) si anunta in #zdev-pulse. Autorul poate sugera in issue, de la inceput, reviewerii potriviti; automatizarea ii prefera daca sunt eligibili (zi de lucru, nu Busy, nu asigneeul), altfel foloseste rotatia. Nu cauti tu reviewer si nu anunti manual. Review-ul se face intr-o zi lucratoare de la asignare; daca reviewerul nu da niciun semn (niciun review, niciun comentariu), automatizarea trece la urmatorul din rotatie. Daca reviewerul pus nu e persoana potrivita (nu are contextul), poate raspunde "/reassign <motiv>" ca sa paseze imediat la urmatorul eligibil, fara sa astepte ziua lucratoare. Daca nu exista niciun reviewer eligibil (toti plecati / Busy), PR-ul ramane in coada si se semnaleaza in #zdev-pulse - primul disponibil il preia.
5. Modificari cerute. Reviewerul lasa comentarii, autorul rezolva si raspunde la fiecare (rezolvat / de discutat), apoi cere re-review. Re-review-ul il face acelasi reviewer (are deja contextul), intr-o zi lucratoare a lui. Daca reviewerul nu e disponibil peste o zi lucratoare si review-ul nu depinde de ce stie doar el, autorul cere alt reviewer; acela face review complet, nu doar pe ce s-a schimbat de la ultimele comentarii.
6. Aprobare. Implicit: un approve uman independent. Nu poate veni de la asigneeul issue-ului (se verifica automat). Un approve inseamna ca ai inteles ce face schimbarea, nu doar ca "arata bine". Daca aprobi, iti asumi.
   - Review inseamna sa citesti si sa intelegi codul; nu esti obligat sa rulezi fiecare PR local. Dar daca nu poti judeca onest comportamentul doar din cod (schimbare riscanta, logica complicata, UI), rularea locala face parte din review - pasii de la "cum se testeaza" sunt si pentru tine. "Arata bine", fara sa fi inteles, nu e approve.
   - La task-urile cu needs-2-reviews: dupa primul approve, automatizarea cere al doilea reviewer. Al doilea review e pe arhitectura si risc, nu pe stil. Label-ul se pune de obicei la aliniere (sectiunea 5), dar oricine (autor sau Alex) il poate adauga oricand inainte de merge - inclusiv la task-uri mici, daca schimbarea e riscanta.
7. Ready to merge. Cand exista approve-urile necesare si CI-ul e verde, automatizarea pune label-ul ready-to-merge si anunta in #zdev-pulse. Asta e semnalul oficial ca task-ul e gata de merge - nimeni nu intreaba si nimeni nu anunta manual.
8. Merge si deploy. Merge-ul il face Alex (deocamdata), apoi deploy manual in productie, cu anunt in #zdev-deploy.
9. Verificare in productie. Dupa anuntul de deploy, autorul ruleaza pe productie pasii de la "cum se testeaza" din PR si pune bifa la mesajul de deploy. Daca ceva nu merge, redeschide issue-ul si repara. Daca autorul nu e disponibil la deploy, verifica reviewerul (sau Alex), cu o nota in thread.
10. Regresii. Daca apare o regresie (din logs, de la useri, sau la verificare), dupa ce o repari, scrii in thread-ul de deploy 3 linii: ce s-a intamplat / din ce cauza / ce facem pe viitor. Scopul e sa invatam, nu sa gasim vinovati. Postmortem mai amplu doar daca acelasi tip de problema se repeta sau au fost afectati clienti.

Hotfix (productie afectata). PR-ul ia label-ul hotfix. Sari peste aliniere (sectiunea 5). Review pe loc: primul om disponibil (sau Alex) il cauti direct, nu astepti rotatia. Merge si deploy cum ai un approve si CI verde; in incidente critice, Alex poate decide sa nu astepte. Dupa ce stingi incendiul, cel tarziu a doua zi: creezi sau completezi issue-ul, pui descriere pe PR si scrii cele 3 linii de regresie. In incident conteaza viteza; trasabilitatea o reconstruiesti imediat dupa.

PR-urile lui Alex. Trec prin acelasi draft + review AI si aceleasi criterii de ready. Review-ul uman e insa la decizia lui, dupa risc. Raman vizibile in anunturile de deploy si oricine poate comenta pe ele, inclusiv dupa merge.

Bypass de review (doar Alex). Rar, Alex poate forta ready-to-merge fara un approve independent, comentand "/bypass <motiv>" pe PR. PR-ul primeste label-ul bypass-allowed si un anunt vizibil in #zdev-pulse cu motivul, ca sa fie clar ca a intrat fara review uman. CI-ul tot trebuie sa fie verde. Urgentele de productie merg pe hotfix.

Task-uri care nu ajung in cod de productie (research, investigatii, documentatie): DoD-ul standard nu se aplica; il definesti in issue.


SECTIUNEA 7: VACANTA SI ZILE LIBERE

Concediu de odihna:
1. DM Alex cu cel putin 1 saptamana inainte cu perioada dorita. Concediul trebuie aprobat inainte sa fie considerat confirmat.
2. Dupa confirmare, completezi cererea de concediu.
3. Dupa aprobare, anunti echipa in #zdev-status.

Conflicte (mai multi care vor aceeasi perioada): se discuta individual cu Alex. Nu exista o regula automata, depinde de context.

Pentru situatii neprevazute care te impiedica sa lucrezi: anunti in DM Alex cat poti de repede, plus mesaj in #zdev-status.

Disponibilitate pentru review. Cand ti se aproba concediul, iti pui statusul de GitHub pe Busy, cu data de expirare (se sterge singur la intoarcere) - automatizarea de review nu te mai pune reviewer cat esti plecat. Pentru part-time: zilele tale de lucru sunt in reviewers.yml; cand iti schimbi programul, actualizezi fisierul (un PR de o linie).
