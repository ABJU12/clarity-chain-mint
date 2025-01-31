import {
  Clarinet,
  Tx,
  Chain,
  Account,
  types
} from 'https://deno.land/x/clarinet@v1.0.0/index.ts';
import { assertEquals } from 'https://deno.land/std@0.90.0/testing/asserts.ts';

Clarinet.test({
  name: "Ensure that only contract owner can create assets",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get("deployer")!;
    const wallet1 = accounts.get("wallet_1")!;

    let block = chain.mineBlock([
      Tx.contractCall("chain-mint", "create-asset", 
        [types.utf8("Test Asset")], wallet1.address)
    ]);
    block.receipts[0].result.expectErr(100); // err-owner-only

    block = chain.mineBlock([
      Tx.contractCall("chain-mint", "create-asset",
        [types.utf8("Test Asset")], deployer.address)
    ]);
    block.receipts[0].result.expectOk(1); // First asset ID = 1
  },
});

Clarinet.test({
  name: "Ensure asset transfer works correctly",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get("deployer")!;
    const wallet1 = accounts.get("wallet_1")!;
    const wallet2 = accounts.get("wallet_2")!;

    let block = chain.mineBlock([
      Tx.contractCall("chain-mint", "create-asset",
        [types.utf8("Test Asset")], deployer.address),
      Tx.contractCall("chain-mint", "transfer-asset",
        [types.uint(1), types.principal(wallet1.address)], deployer.address)
    ]);
    
    block.receipts.forEach(receipt => {
      receipt.result.expectOk();
    });

    let asset = chain.callReadOnlyFn("chain-mint", "get-asset-by-id", 
      [types.uint(1)], deployer.address);
    assertEquals(asset.result.expectSome().owner, wallet1.address);
  },
});

Clarinet.test({
  name: "Ensure metadata updates work correctly", 
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get("deployer")!;
    
    let block = chain.mineBlock([
      Tx.contractCall("chain-mint", "create-asset",
        [types.utf8("Initial Metadata")], deployer.address),
      Tx.contractCall("chain-mint", "update-metadata",
        [types.uint(1), types.utf8("Updated Metadata")], deployer.address)
    ]);

    block.receipts.forEach(receipt => {
      receipt.result.expectOk();
    });

    let asset = chain.callReadOnlyFn("chain-mint", "get-asset-by-id",
      [types.uint(1)], deployer.address);
    assertEquals(asset.result.expectSome().metadata, "Updated Metadata");
  },
});
