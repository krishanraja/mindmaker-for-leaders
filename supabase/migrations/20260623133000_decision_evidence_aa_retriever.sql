-- Allow the Artificial Analysis benchmark retriever on decision_evidence. The
-- decision-engine attaches AA model ground-truth (intelligence index, price,
-- rank) as independent validation for claims that name a specific model; the
-- retriever CHECK previously rejected it, silently failing the whole evidence
-- batch for those claims. Idempotent drop + recreate.
alter table decision_evidence drop constraint if exists decision_evidence_retriever_check;
alter table decision_evidence add constraint decision_evidence_retriever_check
  check (retriever = any (array[
    'perplexity','exa','brave','tavily','newsapi','pdl','builtwith','tranco','memory','user_contest','artificialanalysis'
  ]));
