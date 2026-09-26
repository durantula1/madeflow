-- A project can hold several base offers (a bathroom now, a kitchen next spring). Each is its own
-- agreement with its own changes, stages, installments and receipts (offer_id). The advisory lock in
-- createOfferAction still serializes offer numbering (ОФ-001, ОФ-002, …).
DROP INDEX app.change_orders_one_offer_per_project_uidx;
