;; Chain Mint Contract
;; Tokenize physical assets on chain

;; Constants
(define-constant contract-owner tx-sender)
(define-constant err-owner-only (err u100))
(define-constant err-asset-exists (err u101))
(define-constant err-unauthorized (err u102))
(define-constant err-asset-not-found (err u103))

;; Data structures
(define-map assets
  { asset-id: uint }
  {
    owner: principal,
    metadata: (string-utf8 500),
    created-at: uint,
    updated-at: uint
  })

(define-map asset-history
  { asset-id: uint, tx-id: uint }
  {
    previous-owner: principal,
    new-owner: principal,
    timestamp: uint
  })

;; Storage
(define-data-var last-asset-id uint u0)
(define-data-var last-history-id uint u0)

;; Public functions
(define-public (create-asset (metadata (string-utf8 500)))
  (let
    ((asset-id (+ (var-get last-asset-id) u1))
     (timestamp (unwrap-panic (get-block-info? time (- block-height u1)))))
    (asserts! (is-eq tx-sender contract-owner) err-owner-only)
    (try! (create-asset-entry asset-id tx-sender metadata timestamp))
    (var-set last-asset-id asset-id)
    (ok asset-id)))

(define-public (transfer-asset (asset-id uint) (recipient principal))
  (let ((asset (unwrap! (get-asset-by-id asset-id) err-asset-not-found))
        (sender tx-sender)
        (timestamp (unwrap-panic (get-block-info? time (- block-height u1)))))
    (asserts! (is-eq (get owner asset) sender) err-unauthorized)
    (try! (update-asset-owner asset-id recipient timestamp))
    (try! (add-to-history asset-id sender recipient timestamp))
    (ok true)))

(define-public (update-metadata (asset-id uint) (new-metadata (string-utf8 500)))
  (let ((asset (unwrap! (get-asset-by-id asset-id) err-asset-not-found))
        (timestamp (unwrap-panic (get-block-info? time (- block-height u1)))))
    (asserts! (is-eq (get owner asset) tx-sender) err-unauthorized)
    (try! (update-asset-metadata asset-id new-metadata timestamp))
    (ok true)))

;; Read only functions
(define-read-only (get-asset-by-id (asset-id uint))
  (map-get? assets {asset-id: asset-id}))

(define-read-only (get-asset-history (asset-id uint))
  (map-get? asset-history {asset-id: asset-id}))
