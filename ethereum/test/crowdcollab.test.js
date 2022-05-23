const CampaignCreator = artifacts.require("CampaignCreator.sol");
const CrowdCollab = artifacts.require("CrowdCollab.sol");

let campaignCreator;
let campaignAddress;
let campaign;

before(async () => {
	campaignCreator = await CampaignCreator.new()

	var minContribution = '1000000000000';
    var description = 'test CrowdCollab dApp';

	await campaignCreator.createCampaign(minContribution, description);

	campaignAddress = await campaignCreator.getDeployedCampaigns.call();

	campaign = await CrowdCollab.at(campaignAddress[0]);
});


contract("CrowdCollab test", (accounts) => {

    // Test to ensure that campaignAddress is not undefined
	it('campaign has an address', async () => {
    	assert.ok(campaignAddress);
	});

    // Test to ensure that the new campaign has a variable maned minimumContribution.
	it('campaign has minimumContribution', async () => {
    	minimumContribution = await campaign.minimumContribution.call();
    	assert.ok(minimumContribution);
    });

    // Test to ensure that the manager of the contract, is indeed the accounts[0] address used by truffle in the deployment of the campaign to the Ethereum local test network
	it('has a manager', async () => {
    	var managerAddress = await campaign.manager.call();
    	assert.equal(managerAddress, accounts[0]);
	});

    // Test to ensure that the description of the campaign, is equal to the value, we set up in the before() function
	it('has a description', async () => {
    	var description = await campaign.campaignDescription.call();
    	assert.equal(description, 'test CrowdCollab dApp');
	});

    // Test to ensure that the address, can be the supporter, if sending more than the min. contribution. The new address is read from the second element of the accounts array (newSupporter = accounts[1])
	it('allows supporters with minimum contribution', async () => {
    	var newSupporter = accounts[1];
    	var newContribution = '1000000000001';
    	await campaign.support({from: newSupporter, value: newContribution});
    	var isSupporter = await campaign.supporters.call(newSupporter);

    	assert.ok(isSupporter);
	});

    // Test to create various supporters, using the accounts array: new supporter = accounts[2:6]
	it('allows multiple supporters to join the campaign', async () => {
    	var contribution = '1000000000001';
    	for (var i=2; i < 6; i++) {
        	await campaign.support({from: accounts[i], value: contribution});
    	};
    	var numberSupporters = await campaign.numberSupporters.call();

        assert.equal(numberSupporters, '5');
    });

    // Test for failure
	it('restricts supporters without minimum contribution', async () => {
    	var nonSupporter = accounts[6];
    	var newContribution = '1000000000000';
    	try {
        	await campaign.support({from: nonSupporter, value: newContribution});
    	} catch (error) {
        	assert(error);
    	}
    	var isSupporter = await campaign.supporters.call(nonSupporter);
    	assert.ok(!isSupporter);
	});

    // Test that a manager can create a new request
	it('allows creation of a request by manager', async () => {
    	var description = 'Hire design team';
    	var amount = '1000000000';
    	var recipient = accounts[9];

    	await campaign.createRequest(description, amount, recipient,
                            	{ from: accounts[0] });
    	var request = await campaign.requests.call(0);

    	assert(request);
	});

    // Test that a supporter can not create a spending request
	it('restricts creation of request if not manager', async () => {
    	var description = 'IceCream for manager';
    	var amount = '1000000000';
    	var recipient = accounts[9];

    	try {
        	await campaign.createRequest(description, amount, recipient,
                            	{ from: accounts[1] });
        	assert(false);
    	} catch (error) {
        	assert(error);
    	}
	});

    // Test the process of request approval by the supporters
	it('allows supporter to vote', async () => {
    	var supporter = accounts[1];

    	await campaign.approveRequest(0, {from: supporter});
    	var request = await campaign.requests.call(0);

    	assert.equal(request[4].toNumber(), 1);
    });

    // Test that the supporter cannot vote twice on the same request
    it('restricts supporters from double voting', async () => {
    	var supporter = accounts[1];

    	try {
        	await campaign.approveRequest(0, {from: supporter});
    	}catch (error) {
        	assert(error);
    	}

    	var request = await campaign.requests.call(0);
    	assert.equal(request[4].toNumber(), 1);
    });

    // Test that a request, requires an absolute majority, in order to be finalized by the manager
	it('restricts manager to finalize request if not absolute majority ', async () => {
    	var manager = accounts[0];
    	try {
        	await campaign.finalizeRequest(0, {from: manager});
    	}catch (error) {
        	assert(error);
    	}

    	var request = await campaign.requests.call(0);

    	assert(!request[3]);
	});

    // Test that the finalizeRequest function triggered by the manager if there is an absolute majority
    it('allows manager to finalize request if majority', async () => {
    for (var i=2; i < 4; i++) {
        await campaign.approveRequest(
            0, {from: accounts[i]} );
    };

    var manager = accounts[0];
    await campaign.finalizeRequest(
        0, {from: manager}
    );
    var request = await campaign.requests.call(0);
    var requestComplete = request[3];

    assert(requestComplete);
    });

    // Test that the recipient of the request, received the corresponding amount of ether, after the completion of the request
    it('request recipient receives ether', async () => {
    var regularAccountBalance =
        await web3.eth.getBalance(accounts[8], function(err, result) {
            if (err) {
                console.log(err)
            } else {
                console.log('Regular balance: ' + result)
            }
        });

    var requestRecipientBalance =
        await web3.eth.getBalance(accounts[9], function(err, result) {
            if (err) {
                console.log(err)
            } else {
                console.log('Request Receipient balance: ' + result)
            }
        });

    var request = await campaign.requests.call(0);
    var amountToReceive = request[1].toNumber();
    console.log('Amount to receive: ' + amountToReceive)
    assert.equal(
        amountToReceive + parseInt(regularAccountBalance), parseInt(requestRecipientBalance))
    });
})
