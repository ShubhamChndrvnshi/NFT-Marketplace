const getEventData = (contract, receipt, eventName) => {
    let eventFragment;
    try {
        eventFragment = contract.interface.getEvent(eventName);
    }
    catch (e) {
        // ignore error
    }
    if (eventFragment === undefined) {
        return new Error(eventName + " not emitted")
    }
    const topic = contract.interface.getEventTopic(eventFragment);
    return (contract.interface.parseLog((filterLogsWithTopics(receipt.logs, topic, contract.address))[0])).args;
}

const filterLogsWithTopics = (logs, topic, contractAddress) => logs.filter((log) => log.topics.includes(topic))
    .filter((log) => log.address && log.address.toLowerCase() === contractAddress.toLowerCase());

module.exports = {
    getEventData
}