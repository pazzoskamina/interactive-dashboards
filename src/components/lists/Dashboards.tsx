import { AddIcon } from "@chakra-ui/icons";
import {
    Button,
    Spacer,
    Stack,
    Table,
    Tbody,
    Td,
    Text,
    Th,
    Thead,
    Tr,
} from "@chakra-ui/react";
import { useDataEngine } from "@dhis2/app-runtime";
import { useNavigate } from "@tanstack/react-location";
import { useStore } from "effector-react";
import { useEffect, useState } from "react";
import { dashboardApi, dashboardTypeApi, storeApi } from "../../Events";
import { IDashboard, LocationGenerics } from "../../interfaces";
import { deleteDocument, useDashboards } from "../../Queries";
import { $settings, $store, $path } from "../../Store";
import { generateUid } from "../../utils/uid";
import LoadingIndicator from "../LoadingIndicator";

const Dashboards = () => {
    const navigate = useNavigate<LocationGenerics>();
    const store = useStore($store);
    const { storage, template } = useStore($settings);
    const path = useStore($path);
    const engine = useDataEngine();
    const [loading, setLoading] = useState<boolean>(false);
    const [currentId, setCurrentId] = useState<string>("");
    const { isLoading, isSuccess, isError, error, data } = useDashboards(
        storage,
        store.systemId
    );

    const [response, setResponse] = useState<IDashboard[] | undefined>(data);

    const deleteResource = async (id: string) => {
        setCurrentId(() => id);
        setLoading(() => true);
        await deleteDocument(storage, "i-dashboards", id, engine);
        setResponse((prev) => prev?.filter((p) => p.id !== id));
        setLoading(() => false);
    };

    useEffect(() => {
        setResponse(() => data);
    }, [data]);

    return (
        <Stack p="20px">
            <Text fontSize="2xl" fontWeight="bold" p="2" color="blue.600">
                Dashboard List
            </Text>
            <Stack direction="row">
                <Spacer />
                <Button
                    onClick={() => {
                        dashboardTypeApi.set("dynamic");
                        storeApi.setRefresh(true);
                        navigate({
                            to: `${path}${generateUid()}`,
                            search: {
                                action: "create",
                                periods: store.periods.map((i) => String(i.id)),
                                organisations: store.organisations,
                                groups: store.groups,
                                levels: store.levels,
                            },
                        });
                    }}
                    colorScheme="blue"
                >
                    <AddIcon mr="2" />
                    New Dynamic Dashboard
                </Button>
                <Button
                    onClick={() => {
                        dashboardTypeApi.set("fixed");
                        storeApi.setRefresh(true);
                        navigate({
                            to: `${path}${generateUid()}`,
                            search: {
                                action: "create",
                                periods: store.periods.map((i) => i.value),
                                organisations: store.organisations,
                                groups: store.groups,
                                levels: store.levels,
                            },
                        });
                    }}
                    colorScheme="blue"
                >
                    <AddIcon mr="2" />
                    New Fixed Dashboard
                </Button>
            </Stack>
            <Stack alignContent="center" alignItems="center" flex={1}>
                {isLoading && <LoadingIndicator />}
                {isSuccess && (
                    <Table variant="striped" w="100%">
                        <Thead>
                            <Tr>
                                <Th>Name</Th>
                                <Th>Category</Th>
                                <Th>Published</Th>
                                <Th>Refresh Interval</Th>
                                <Th>Description</Th>
                                <Th>Actions</Th>
                            </Tr>
                        </Thead>
                        <Tbody>
                            {response?.map((dashboard: IDashboard) => (
                                <Tr key={dashboard.id} cursor="pointer">
                                    <Td
                                        onClick={async () => {
                                            dashboardApi.setCurrentDashboard(
                                                dashboard
                                            );
                                            storeApi.changeSelectedDashboard(
                                                dashboard.id
                                            );
                                            storeApi.changeSelectedCategory(
                                                dashboard.category || ""
                                            );
                                            let currentPath = path;
                                            if (dashboard.id === template) {
                                                currentPath = "/dashboards/";
                                            }
                                            navigate({
                                                to: `${currentPath}${dashboard.id}`,
                                                search: {
                                                    action: "update",
                                                    category:
                                                        dashboard.category,
                                                    periods: store.periods.map(
                                                        (i) => i.value
                                                    ),
                                                    organisations:
                                                        store.organisations,
                                                    groups: store.groups,
                                                    levels: store.levels,
                                                    display: "dashboard",
                                                },
                                            });
                                        }}
                                    >
                                        {dashboard.name}
                                    </Td>
                                    <Td>{dashboard.category}</Td>
                                    <Td>
                                        {dashboard.published ? "Yes" : "No"}
                                    </Td>
                                    <Td>{dashboard.refreshInterval}</Td>
                                    <Td>{dashboard.description}</Td>
                                    <Td>
                                        <Stack direction="row" spacing="5px">
                                            <Button
                                                colorScheme="green"
                                                size="xs"
                                                onClick={async () => {
                                                    dashboardApi.setCurrentDashboard(
                                                        dashboard
                                                    );
                                                    storeApi.changeSelectedDashboard(
                                                        dashboard.id
                                                    );
                                                    storeApi.changeSelectedCategory(
                                                        dashboard.category || ""
                                                    );

                                                    navigate({
                                                        to: `/dashboards/${dashboard.id}`,
                                                        search: {
                                                            action: "update",
                                                            category:
                                                                dashboard.category,
                                                            periods:
                                                                store.periods.map(
                                                                    (i) =>
                                                                        i.value
                                                                ),
                                                            organisations:
                                                                store.organisations,
                                                            groups: store.groups,
                                                            levels: store.levels,
                                                            display:
                                                                "dashboard",
                                                        },
                                                    });
                                                }}
                                            >
                                                Edit
                                            </Button>
                                            <Button
                                                colorScheme="green"
                                                size="xs"
                                                onClick={async () => {
                                                    dashboardApi.setCurrentDashboard(
                                                        dashboard
                                                    );
                                                    storeApi.changeSelectedDashboard(
                                                        dashboard.id
                                                    );
                                                    storeApi.changeSelectedCategory(
                                                        dashboard.category || ""
                                                    );

                                                    navigate({
                                                        to: `/dashboards/${dashboard.id}`,
                                                        search: {
                                                            action: "view",
                                                            category:
                                                                dashboard.category,
                                                            periods:
                                                                store.periods.map(
                                                                    (i) =>
                                                                        i.value
                                                                ),
                                                            organisations:
                                                                store.organisations,
                                                            groups: store.groups,
                                                            levels: store.levels,
                                                            display: "report",
                                                        },
                                                    });
                                                }}
                                            >
                                                View as Report
                                            </Button>
                                            <Button size="xs">Duplicate</Button>
                                            <Button
                                                colorScheme="red"
                                                size="xs"
                                                isLoading={
                                                    loading &&
                                                    currentId === dashboard.id
                                                }
                                                onClick={() =>
                                                    deleteResource(dashboard.id)
                                                }
                                            >
                                                Delete
                                            </Button>
                                        </Stack>
                                    </Td>
                                </Tr>
                            ))}
                        </Tbody>
                    </Table>
                )}
                {isError && <Text>No data/Error occurred</Text>}
            </Stack>
        </Stack>
    );
};

export default Dashboards;
