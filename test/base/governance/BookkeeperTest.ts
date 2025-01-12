import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import {MaticAddresses} from "../../MaticAddresses";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
import {Bookkeeper} from "../../../typechain";
import {ethers} from "hardhat";
import {DeployerUtils} from "../../../scripts/deploy/DeployerUtils";
import {TimeUtils} from "../../TimeUtils";
import {UniswapUtils} from "../../UniswapUtils";
import {CoreContractsWrapper} from "../../CoreContractsWrapper";
import {VaultUtils} from "../../VaultUtils";
import {BigNumber} from "ethers";
import {Erc20Utils} from "../../Erc20Utils";
import {MintHelperUtils} from "../../MintHelperUtils";

const {expect} = chai;
chai.use(chaiAsPromised);

describe("Bookkeeper tests", function () {
  let snapshotBefore: string;
  let snapshot: string;
  let signer: SignerWithAddress;
  let signer1: SignerWithAddress;
  let signerAddress: string;
  let core: CoreContractsWrapper;
  let bookkeeper: Bookkeeper;

  before(async function () {
    snapshotBefore = await TimeUtils.snapshot();
    signer = (await ethers.getSigners())[0];
    signer1 = (await ethers.getSigners())[1];
    signerAddress = signer.address;
    core = await DeployerUtils.deployAllCoreContracts(signer);
    bookkeeper = core.bookkeeper;
    await UniswapUtils.wrapMatic(signer); // 10m wmatic
  });

  after(async function () {
    await TimeUtils.rollback(snapshotBefore);
  });


  beforeEach(async function () {
    snapshot = await TimeUtils.snapshot();
  });

  afterEach(async function () {
    await TimeUtils.rollback(snapshot);
  });

  it("should not deploy with zero controller", async () => {
    await expect(DeployerUtils.deployBookkeeper(signer, MaticAddresses.ZERO_ADDRESS)).rejectedWith('zero address');
  });

  it("should not register strat action for non strat", async () => {
    await expect(bookkeeper.registerStrategyEarned('1')).is.rejectedWith("only exist strategy");
  });

  it("should not register ppfs change for non forwarder", async () => {
    await expect(bookkeeper.registerPpfsChange(MaticAddresses.ZERO_ADDRESS, '1')).is.rejectedWith("only exist forwarder");
  });

  it("should not register user action for non vault", async () => {
    await expect(bookkeeper.registerUserAction(MaticAddresses.ZERO_ADDRESS, '1', true)).is.rejectedWith("only exist vault");
  });

  it("should not add vault", async () => {
    await expect(bookkeeper.connect(signer1).addVault(MaticAddresses.ZERO_ADDRESS)).is.rejectedWith("not controller");
  });

  it("should not add strategy", async () => {
    await expect(bookkeeper.connect(signer1).addStrategy(MaticAddresses.ZERO_ADDRESS)).is.rejectedWith("not controller");
  });

  it("is governance", async () => {
    expect(await bookkeeper.connect(signer1).isGovernance(MaticAddresses.ZERO_ADDRESS)).is.eq(false);
  });

  it("last hardwork", async () => {
    expect((await bookkeeper.connect(signer1).lastHardWork(MaticAddresses.ZERO_ADDRESS))[1]).is.eq(0);
  });

  it("existed vault and strategy should not be added", async () => {
    const vaults = await bookkeeper.vaults();
    const strategies = await bookkeeper.strategies();
    expect(vaults.length).is.greaterThanOrEqual(1);
    expect(strategies.length).is.greaterThanOrEqual(1);

    await bookkeeper.addVaultAndStrategy(core.psVault.address, await (core.psVault.strategy()));

    expect((await bookkeeper.vaults()).length).is.eq(vaults.length, 'existed vault should not be added');
    expect((await bookkeeper.strategies()).length).is.eq(strategies.length, 'existed strategy should not be added');
  });

  it("add vault and strategy manually", async () => {
    const vaults = await bookkeeper.vaults();
    const strategies = await bookkeeper.strategies();
    expect(vaults.length).is.greaterThanOrEqual(1);
    expect(strategies.length).is.greaterThanOrEqual(1);

    await bookkeeper.addVaultAndStrategy(MaticAddresses.ZERO_ADDRESS, MaticAddresses.ZERO_ADDRESS);
    expect((await bookkeeper.vaults()).length).is.eq(vaults.length + 1, 'existed vault should not be added');
    expect((await bookkeeper.strategies()).length).is.eq(strategies.length + 1, 'existed strategy should not be added');
  });

  it("remove vault and strategy manually", async () => {
    const vaults = await bookkeeper.vaults();
    const strategies = await bookkeeper.strategies();
    expect(vaults.length).is.greaterThanOrEqual(1);
    expect(strategies.length).is.greaterThanOrEqual(1);

    await bookkeeper.removeFromVaults(0);
    await bookkeeper.removeFromStrategies(0);

    expect((await bookkeeper.vaults()).length).is.eq(vaults.length - 1, 'existed vault should not be added');
    expect((await bookkeeper.strategies()).length).is.eq(strategies.length - 1, 'existed strategy should not be added');
  });

  it("user count should work correctly", async () => {
    const vault = core.psVault;

    // ********** USER1 deposit
    await MintHelperUtils.mint(core.controller, core.announcer, '100000', signer.address);
    await VaultUtils.deposit(signer, vault, BigNumber.from('1000'));

    let user1Bal = await bookkeeper.vaultUsersBalances(vault.address, signer.address)
    let vaultUsers = await bookkeeper.vaultUsersQuantity(vault.address);

    expect(user1Bal).eq(1000);
    expect(vaultUsers).eq(1);

    // ******** USER1 transfer to USER2
    await Erc20Utils.transfer(vault.address, signer, signer1.address, '500');

    user1Bal = await bookkeeper.vaultUsersBalances(vault.address, signer.address)
    let user2Bal = await bookkeeper.vaultUsersBalances(vault.address, signer1.address)
    vaultUsers = await bookkeeper.vaultUsersQuantity(vault.address);


    expect(user1Bal).eq(500);
    expect(user2Bal).eq(500);
    expect(vaultUsers).eq(2);

    // ******** USER1 exit
    await vault.exit();

    user1Bal = await bookkeeper.vaultUsersBalances(vault.address, signer.address)
    user2Bal = await bookkeeper.vaultUsersBalances(vault.address, signer1.address)
    vaultUsers = await bookkeeper.vaultUsersQuantity(vault.address);


    expect(user1Bal).eq(0);
    expect(user2Bal).eq(500);
    expect(vaultUsers).eq(1);

    // *********** USER2 exit

    await vault.connect(signer1).exit();

    user1Bal = await bookkeeper.vaultUsersBalances(vault.address, signer.address)
    user2Bal = await bookkeeper.vaultUsersBalances(vault.address, signer1.address)
    vaultUsers = await bookkeeper.vaultUsersQuantity(vault.address);


    expect(user1Bal).eq(0);
    expect(user2Bal).eq(0);
    expect(vaultUsers).eq(0);

  });

});
